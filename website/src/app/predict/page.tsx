"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type DataJsonType = {
  [year: string]: {
    [week: string]: {
      [state: string]: number;
    };
  };
};

function buildTimeline(data: DataJsonType): { entries: { year: string; week: string }[] } {
  const entries: { year: string; week: string }[] = [];
  const years = Object.keys(data).sort();
  for (const year of years) {
    const weeks = Object.keys(data[year]).sort((a, b) => Number(a) - Number(b));
    for (const week of weeks) {
      entries.push({ year, week });
    }
  }
  return { entries };
}

export default function BrazilMap() {
  const [data, setData] = useState<DataJsonType | null>(null);
  const [geojson, setGeojson] = useState<any>(null);
  const [timelineIndex, setTimelineIndex] = useState(0);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson"
    )
      .then((res) => res.json())
      .then((geoData) => setGeojson(geoData));
  }, []);

  useEffect(() => {
    fetch("/data.json")
      .then((res) => res.json())
      .then((jsonData) => setData(jsonData));
  }, []);

  const timeline = useMemo(() => {
    if (!data) return { entries: [] };
    return buildTimeline(data);
  }, [data]);

  const { year: selectedYear, week: selectedWeek } = useMemo(() => {
    if (timeline.entries.length === 0) return { year: "2024", week: "1" };
    return timeline.entries[Math.min(timelineIndex, timeline.entries.length - 1)];
  }, [timeline, timelineIndex]);

  const casesByState = useMemo(() => {
    if (!data) return {};
    if (!data[selectedYear]) return {};
    if (!data[selectedYear][selectedWeek]) return {};
    return data[selectedYear][selectedWeek];
  }, [data, selectedYear, selectedWeek]);

  const maxCases = useMemo(() => {
    const values = Object.values(casesByState);
    if (values.length === 0) return 1;
    return Math.max(...values);
  }, [casesByState]);

  // Cor: quanto mais casos, mais escuro o vermelho (do claro ao escuro)
  function getColor(cases: number) {
    if (cases === 0) return "#1a1a1a"; // cinza muito escuro para zero casos
    // interpolar entre vermelho claro (#ff6666) e vermelho escuro (#660000)
    const ratio = cases / maxCases;
    // quanto maior o ratio, mais escuro (invertendo a intensidade)
    const r = 102 + Math.round((1 - ratio) * (255 - 102)); // R: 102-255 (mais claro no R conforme menos casos)
    const g = Math.round((1 - ratio) * 102); // G vai de 102 a 0 conforme ratio
    const b = Math.round((1 - ratio) * 102); // B vai de 102 a 0 conforme ratio
    return `rgb(${r},${g},${b})`;
  }

  function style(feature: any) {
    const uf = feature.properties.sigla;
    const cases = casesByState[uf] || 0;
    return {
      fillColor: getColor(cases),
      weight: 1,
      opacity: 1,
      color: "#333", // borda escura para combinar com fundo
      fillOpacity: 0.9,
      dashArray: cases === 0 ? "3" : "",
      transition: "fill-color 0.3s ease",
    };
  }

  function onEachFeature(feature: any, layer: L.Layer) {
    const uf = feature.properties.sigla;
    const cases = casesByState[uf] || 0;

    layer.bindTooltip(
      `${uf}: ${cases} ${cases === 1 ? "caso" : "casos"}`,
      { sticky: true, className: "bg-black text-white px-2 py-1 rounded shadow-lg" }
    );

    layer.on({
      mouseover: (e) => {
        (e.target as L.Path).setStyle({
          weight: 3,
          color: "#ff4444",
          fillOpacity: 1,
        });
      },
      mouseout: (e) => {
        (e.target as L.Path).setStyle(style(feature));
      },
    });
  }

  // Total de casos na semana atual para exibir
  const totalCases = useMemo(() => {
    return Object.values(casesByState).reduce((acc, val) => acc + val, 0);
  }, [casesByState]);

  if (!geojson)
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Carregando mapa...
      </div>
    );

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Carregando dados...
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white font-sans px-6 py-12 flex flex-col items-center">
      <header className="fixed top-0 left-0 w-full bg-black bg-opacity-90 backdrop-blur-md shadow-md z-50 py-4 px-8 flex justify-between items-center">
        <h1 className="text-3xl font-extrabold tracking-tight select-none">Mapa de Casos no Brasil</h1>
        <nav className="text-gray-300 space-x-6">
          <a href="/" className="hover:text-red-500 transition">Home</a>
          <a href="/sobre" className="hover:text-red-500 transition">Sobre</a>
        </nav>
      </header>

      <main className="mt-20 w-full max-w-7xl flex flex-col items-center gap-8">
        <div className="w-full max-w-lg">
          <label
            htmlFor="timeline"
            className="block mb-2 text-center font-semibold text-lg select-none text-gray-300"
          >
            Semana <span className="text-red-500">{selectedWeek}</span> - Ano{" "}
            <span className="text-red-500">{selectedYear}</span>
          </label>
          <input
            id="timeline"
            type="range"
            min={0}
            max={timeline.entries.length - 1}
            value={timelineIndex}
            onChange={(e) => setTimelineIndex(Number(e.target.value))}
            className="w-full h-3 rounded-lg accent-red-600 cursor-pointer"
            style={{ backgroundSize: `${(timelineIndex / (timeline.entries.length - 1)) * 100}% 100%` }}
          />
          <p className="mt-2 text-center text-red-400 font-semibold">
            Total de casos: {totalCases}
          </p>
        </div>

        <div className="w-full max-w-6xl rounded-lg shadow-lg border border-gray-800 overflow-hidden">
        <MapContainer
  center={[-15, -55]}
  zoom={4}
  style={{
    height: "600px",
    width: "100%",
    backgroundColor: "black",
    border: "none",
    boxShadow: "none",
  }}
  zoomControl={false}
  dragging={false}
  doubleClickZoom={false}
  scrollWheelZoom={false}
  attributionControl={false}
  keyboard={false}
  boxZoom={false}
  touchZoom={false}
>
  {/* Sem TileLayer pra não ter fundo */}

  <GeoJSON
    data={geojson}
    style={(feature) => {
      const uf = feature.properties.sigla;
      const cases = casesByState[uf] || 0;
      return {
        fillColor: getColor(cases),
        weight: 1,
        color: "#444", // borda dos estados
        fillOpacity: 0.9,
      };
    }}
    onEachFeature={onEachFeature}
  />
</MapContainer>

        </div>
      </main>

      <footer className="mt-auto w-full text-center text-gray-600 py-6 border-t border-gray-800 select-none">
        &copy; 2025 Undengue-Vision. Todos os direitos reservados.
      </footer>
    </div>
  );
}
