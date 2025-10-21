"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvent,
} from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";

import { renderToStaticMarkup } from "react-dom/server";

interface HeatMapProps {
  points: {
    lat: number;
    lng: number;
    intensity: number; // usado pelo heat (peso bruto, não normalizado globalmente)
    rawIntensity?: number; // opcional: para exibir no popup o valor "cru" vindo da API/import
    imageBase64: string | null;
    detectedObjects: Record<string, number>;
  }[];
  onMapClick: (latLng: [number, number]) => void;
  onMapBackgroundClick?: () => void;
  onRemovePoint: (index: number) => void;
  centerCoords: [number, number];
}

function HeatLayer({
  points,
}: {
  points: { lat: number; lng: number; intensity: number }[];
}) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => (map ? map.getZoom() : 12));

  useMapEvent('zoomend', () => {
    if (map) setZoom(map.getZoom());
  });

  useEffect(() => {
    if (!map) return;

    const maxIntensity = points.length
      ? Math.max(...points.map((p) => p.intensity))
      : 0;

    const minVisibleWeight = 0.0; 

    const heatPoints = points.map((p) => {
      const raw = maxIntensity > 0 ? Math.max(0, p.intensity) / maxIntensity : 0;
      const base = Math.max(0, Math.min(1, raw));
      let weight = base;
      if (base > 0) {
        weight = Math.max(weight, minVisibleWeight);
      }
      return [p.lat, p.lng, weight] as [number, number, number];
    });

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const z = map.getZoom();
    // Opções dependentes do zoom: menor raio/blur no zoom baixo para evitar "mancha uniforme"
  const radius = clamp(Math.round(5 + (z - 5) * 2.8), 4, 32); // z5~5, z14~30
  const blur = clamp(Math.round(5 + (z - 5) * 1.0), 4, 16);  // z5~5, z14~14
  const minOpacity = clamp(0.08 + (z - 5) * 0.028, 0.08, 0.35); // mais translúcido no zoom baixo

    const heat = L.heatLayer(heatPoints, {
      radius,
      blur,
      maxZoom: 17,
      max: 1,
      minOpacity,
      gradient: {
        0.0: "#1d4ed8",
        0.3: "#22d3ee",
        0.6: "#22c55e",
        0.8: "#f59e0b",
        1.0: "#ef4444",
      },
    });

    heat.addTo(map);
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, zoom]);

  return null;
}

function MapClickHandler({
  onMapClick,
  onMapBackgroundClick,
  hasOpenPopup,
}: {
  onMapClick: (latLng: [number, number]) => void;
  onMapBackgroundClick?: () => void;
  hasOpenPopup: boolean;
}) {
  const map = useMap();
  useMapEvent("click", (e) => {
    if (hasOpenPopup) {
      // Fecha popup aberto e não abre formulário
      map.closePopup();
      if (onMapBackgroundClick) {
        onMapBackgroundClick();
      }
      return;
    }
    onMapClick([e.latlng.lat, e.latlng.lng]);
  });
  return null;
}

function PopupStateTracker({ onChange }: { onChange: (open: boolean) => void }) {
  const map = useMap();
  useEffect(() => {
    const onOpen = () => onChange(true);
    const onClose = () => onChange(false);
    map.on("popupopen", onOpen);
    map.on("popupclose", onClose);
    return () => {
      map.off("popupopen", onOpen);
      map.off("popupclose", onClose);
    };
  }, [map, onChange]);
  return null;
}

function PopupContent({
  intensity,
  rawIntensity,
  normalizedIntensity,
  imageBase64,
  detectedObjects,
  onRemove,
}: {
  intensity: number;
  rawIntensity?: number;
  normalizedIntensity?: number; // 0..10
  imageBase64: string | null;
  detectedObjects: Record<string, number>;
  onRemove: () => void;
}) {
  const popupRef = useRef<L.Popup | null>(null);
  const map = useMap();

  const onImageLoad = () => {
    if (popupRef.current) {
      popupRef.current.update();
    }
  };

  useEffect(() => {
    if (!map) return;

    const handlePopupOpen = (_e: L.LeafletEvent) => {
      if (popupRef.current) {
        popupRef.current.update();
      }
    };

    map.on("popupopen", handlePopupOpen);
    return () => {
      map.off("popupopen", handlePopupOpen);
    };
  }, [map]);

  return (
    <Popup
      ref={(ref) => {
        if (ref) popupRef.current = ref;
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {imageBase64 && (
          <img
            src={imageBase64}
            alt="Imagem do ponto"
            style={{ maxWidth: 200, borderRadius: 8 }}
            onLoad={onImageLoad}
          />
        )}
        <span>Intensidade: {(rawIntensity ?? intensity).toFixed(1)}</span>
        {typeof normalizedIntensity === 'number' && (
          <span>Normalizada: {normalizedIntensity.toFixed(1)} / 10</span>
        )}
        {Object.entries(detectedObjects).length > 0 && (
          <div style={{ marginTop: 8, fontSize: 14 }}>
            <strong>Detectados:</strong>
            <ul style={{ paddingLeft: 16, margin: 4 }}>
              {Object.entries(detectedObjects).map(([obj, count]) => (
                <li key={obj}>
                  {obj}: {count}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            marginTop: 10,
            padding: "6px 12px",
            backgroundColor: "#dc2626",
            border: "none",
            borderRadius: 6,
            color: "white",
            cursor: "pointer",
          }}
        >
          Excluir ponto
        </button>
      </div>
    </Popup>
  );
}

function MapFlyToHandler({ centerCoords }: { centerCoords: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (
      map.getCenter().lat !== centerCoords[0] ||
      map.getCenter().lng !== centerCoords[1]
    ) {
      map.flyTo(centerCoords, 12, {
        duration: 1.5,
      });
    }
  }, [centerCoords, map]);

  return null;
}

export default function HeatMap({
  points,
  onMapClick,
  onMapBackgroundClick,
  onRemovePoint,
  centerCoords,
}: HeatMapProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hasOpenPopup, setHasOpenPopup] = useState(false);

  // Máximo atual para normalização de exibição (0..10) no popup
  const maxRawIntensity = useMemo(
    () => Math.max(0, ...points.map(p => Number(p.intensity ?? 0))),
    [points]
  );

  const svgString = renderToStaticMarkup(
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 21C12 21 18 13.5 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 13.5 12 21 12 21ZM12 7C13.6569 7 15 8.34315 15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.34315 10.3431 7 12 7Z"
        fill="#ef0000cc"
      />
    </svg>
  );

  const defaultIcon = new L.DivIcon({
    html: svgString,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const hoverIcon = new L.DivIcon({
    html: `<div class="marker-wrapper hover">${svgString}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  return (
    <MapContainer
      center={centerCoords} // Use a prop para definir o centro inicial
      zoom={14}
      className="z-0"
      scrollWheelZoom={true}
      style={{
        height: "600px",
        width: "100%",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
      minZoom={5}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        noWrap={true}
      />

  <HeatLayer points={points} />
  <PopupStateTracker onChange={setHasOpenPopup} />
  <MapClickHandler hasOpenPopup={hasOpenPopup} onMapClick={onMapClick} onMapBackgroundClick={onMapBackgroundClick} />

      {/* Adicione o componente que anima o mapa aqui */}
      <MapFlyToHandler centerCoords={centerCoords} />

      {points.map(
        ({ lat, lng, intensity, rawIntensity, imageBase64, detectedObjects }, i) => {
          const base = maxRawIntensity > 0 ? Math.max(0, Number(intensity)) / maxRawIntensity : 0;
          const normalized10 = Math.min(10, Math.max(0, base * 10));
          return (
          <Marker
            key={i}
            position={[lat, lng]}
            icon={hoveredIndex === i ? hoverIcon : defaultIcon}
            eventHandlers={{
              mouseover: () => setHoveredIndex(i),
              mouseout: () => setHoveredIndex(null),
            }}
          >
            <PopupContent
              intensity={intensity}
              rawIntensity={rawIntensity}
              normalizedIntensity={normalized10}
              imageBase64={imageBase64}
              detectedObjects={detectedObjects}
              onRemove={() => onRemovePoint(i)}
            />
          </Marker>
          );
        }
      )}
    </MapContainer>
  );
}
