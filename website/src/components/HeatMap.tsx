"use client";

import { MapContainer, TileLayer, useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useEffect } from "react";

interface HeatMapProps {
  points: [number, number, number][];
  onMapClick: (lat: number, lng: number) => void;
}

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const heat = L.heatLayer(points, {
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

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvent("click", (e) => {
    onMapClick(e.latlng.lat, e.latlng.lng);
  });

  return null;
}

export default function HeatMap({ points, onMapClick }: HeatMapProps) {
  return (
    <MapContainer
      center={[-23.552, -46.633]}
      zoom={14}
      scrollWheelZoom={true}
      style={{
        height: "600px",
        width: "100%",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <HeatLayer points={points} />
      <ClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
}
