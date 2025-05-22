"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import * as Slider from "@radix-ui/react-slider";

const HeatMap = dynamic(() => import("../../components/HeatMap"), { ssr: false });

type Point = [number, number, number];
type Forecast = { month: string; reais: number | null; previsto: number };

export default function PrevisaoIncrivel() {
  const baseCoords: [number, number] = [-23.5505, -46.6333];
  const [horizon, setHorizon] = useState(6);
  const [useClimate, setUseClimate] = useState(true);
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [mapPoints, setMapPoints] = useState<Point[]>([]);

  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  useEffect(() => {
    const data: Forecast[] = [];
    const pts: Point[] = [];

    for (let i = 0; i < horizon; i++) {
      const reais = i < 3 ? 50 + i * 20 : null;
      let prev = (reais ?? (50 + 2 * 20)) + i * 10;
      if (useClimate) prev *= 1 + Math.sin((i / horizon) * Math.PI) / 4;
      const previsto = Math.round(prev);

      data.push({ month: months[i], reais, previsto });

      // 30 pontos sintéticos por mês
      for (let j = 0; j < 30; j++) {
        const d = 0.02;
        const lat = +(baseCoords[0] + (Math.random() - 0.5) * d).toFixed(6);
        const lng = +(baseCoords[1] + (Math.random() - 0.5) * d).toFixed(6);
        const intensity = +(Math.max(0, previsto + (Math.random() - 0.5) * 20)).toFixed(1);
        pts.push([lat, lng, intensity]);
      }
    }

    setForecast(data);
    setMapPoints(pts);
  }, [horizon, useClimate]);

  // Gera CSV em string e aciona download
  function downloadCSV() {
    const header = ["Mês,Casos Reais,Previsão"];
    const rows = forecast.map(f =>
      `${f.month},${f.reais ?? ""},${f.previsto}`
    );
    const csv = header.concat(rows).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "previsao_dengue.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen flex bg-[#0b0b0b] text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-zinc-900 p-6 space-y-8 sticky top-0 h-screen">
        <h2 className="text-2xl font-bold">Configurações</h2>

        <div>
          <label className="block mb-1">Horizonte (meses): {horizon}</label>
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            min={1}
            max={12}
            step={1}
            value={[horizon]}
            onValueChange={(v) => setHorizon(v[0])}
          >
            <Slider.Track className="bg-zinc-700 relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-green-500 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 bg-white rounded-full shadow" />
          </Slider.Root>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="clima"
            checked={useClimate}
            onChange={() => setUseClimate(!useClimate)}
            className="accent-green-500 w-5 h-5"
          />
          <label htmlFor="clima">Incluir fator climático</label>
        </div>

        <button
          onClick={downloadCSV}
          className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
        >
          Exportar CSV
        </button>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 px-8 py-12 space-y-12 overflow-y-auto">
        <h1 className="text-4xl font-bold">Previsão de Picos de Dengue</h1>
        <p className="text-zinc-400">
          Ferramenta interativa para pesquisadores com dados sintéticos.
        </p>

        {/* Gráfico */}
        <section className="bg-zinc-900 p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-semibold mb-4">Tendência Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast}>
              <CartesianGrid stroke="#444" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="reais"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Casos Reais"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="previsto"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                name="Previsão"
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Mapa */}
        <section className="bg-zinc-900 p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-semibold mb-4">Mapa de Calor Preditivo</h3>
          <div className="h-96">
            <HeatMap points={mapPoints} onMapClick={() => {}} />
          </div>
        </section>
      </main>
    </div>
  );
}
