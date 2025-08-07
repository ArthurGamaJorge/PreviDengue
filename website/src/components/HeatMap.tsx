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
import { useEffect, useState } from "react";
import { useRef } from "react";

import { renderToStaticMarkup } from "react-dom/server";

interface HeatMapProps {
  points: {
    lat: number;
    lng: number;
    intensity: number;
    imageBase64: string | null;
    detectedObjects: Record<string, number>;
  }[];
  onMapClick: (latLng: [number, number]) => void;
  onRemovePoint: (index: number) => void;
  centerCoords: [number, number];
}

function HeatLayer({
  points,
}: {
  points: { lat: number; lng: number; intensity: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const heatPoints = points.map(
      (p) => [p.lat, p.lng, p.intensity] as [number, number, number]
    );

    const heat = L.heatLayer(heatPoints as any, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 10,
      minOpacity: 0.4,
      gradient: {
        0.0: "blue",
        0.4: "cyan",
        0.6: "lime",
        0.8: "orange",
        1.0: "red",
      },
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (latLng: [number, number]) => void;
}) {
  useMapEvent("click", (e) => {
    onMapClick([e.latlng.lat, e.latlng.lng]);
  });
  return null;
}

function PopupContent({
  intensity,
  imageBase64,
  detectedObjects,
  onRemove,
}: {
  intensity: number;
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

    const handlePopupOpen = (e: L.LeafletEvent) => {
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
        <span>Intensidade: {intensity.toFixed(1)}</span>
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
    if (map.getCenter().lat !== centerCoords[0] || map.getCenter().lng !== centerCoords[1]) {
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
  onRemovePoint,
  centerCoords
}: HeatMapProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const svgHoverString = renderToStaticMarkup(
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 4px yellow)" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 21C12 21 18 13.5 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 13.5 12 21 12 21ZM12 7C13.6569 7 15 8.34315 15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.34315 10.3431 7 12 7Z"
        fill="#ffff00cc"
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
      <MapClickHandler onMapClick={onMapClick} />
      
      {/* Adicione o componente que anima o mapa aqui */}
      <MapFlyToHandler centerCoords={centerCoords} />

      {points.map(
        ({ lat, lng, intensity, imageBase64, detectedObjects }, i) => (
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
              imageBase64={imageBase64}
              detectedObjects={detectedObjects}
              onRemove={() => onRemovePoint(i)}
            />
          </Marker>
        )
      )}
    </MapContainer>
  );
}
