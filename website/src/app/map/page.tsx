"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
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

const MapWithNoSSR = dynamic(() => import("../../components/HeatMap"), { ssr: false });

type Point = [number, number, number];

const chartData = [
  { month: "Jan", AnáliseA: 30, AnáliseB: 20 },
  { month: "Fev", AnáliseA: 45, AnáliseB: 35 },
  { month: "Mar", AnáliseA: 50, AnáliseB: 40 },
  { month: "Abr", AnáliseA: 70, AnáliseB: 55 },
  { month: "Mai", AnáliseA: 90, AnáliseB: 65 },
];

export default function Mapa() {
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [intensityInput, setIntensityInput] = useState("");

  useEffect(() => {
    fetch("/data/points.json")
      .then((res) => res.json())
      .then((data) => setPoints(data))
      .catch((err) => console.error("Erro ao carregar pontos:", err));
  }, []);

  function handleMapClick(lat: number, lng: number) {
    setSelectedCoords([lat, lng]);
    setIntensityInput("");
  }

  function addPoint() {
    if (!selectedCoords) return;

    const intensity = parseInt(intensityInput);
    if (isNaN(intensity) || intensity < 0 || intensity > 10) {
      alert("Intensidade inválida. Informe valor entre 0 e 10.");
      return;
    }

    setPoints((prev) => [...prev, [selectedCoords[0], selectedCoords[1], intensity]]);
    setSelectedCoords(null);
    setIntensityInput("");
  }

  const totalCases = points.reduce((acc, p) => acc + p[2], 0);
  const avgIntensity = (totalCases / points.length).toFixed(2);

  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-8 py-12">
      <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 bg-opacity-90 backdrop-blur-sm shadow-md flex justify-between items-center px-8 py-4 text-white">
        <a href="../">
          <h1 className="text-3xl font-bold tracking-tight">Undengue-Vision</h1>
        </a>
        <nav className="flex gap-8 text-base font-medium">
          <a href="../" className="hover:underline">
            Home
          </a>
        </nav>
      </header>

      <main className="pt-28 max-w-7xl mx-auto">
        {/* KPIs */}
        <section className="grid grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto text-white font-sans">
          <div className="bg-zinc-900 rounded-lg p-6 shadow-lg border border-zinc-800 text-center">
            <h3 className="text-4xl font-extrabold">{totalCases}</h3>
            <p className="text-sm text-zinc-400 mt-1">Total de Intensidade</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-6 shadow-lg border border-zinc-800 text-center">
            <h3 className="text-4xl font-extrabold">{points.length}</h3>
            <p className="text-sm text-zinc-400 mt-1">Total de Pontos</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-6 shadow-lg border border-zinc-800 text-center">
            <h3 className="text-4xl font-extrabold">{avgIntensity}</h3>
            <p className="text-sm text-zinc-400 mt-1">Média Intensidade</p>
          </div>
        </section>

        {/* Gráfico de linhas */}
        <section className="bg-zinc-900 rounded-xl p-6 shadow-lg mb-12">
          <h3 className="text-2xl font-bold mb-6">Análise de Progressão Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#444" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{ backgroundColor: "#222", borderRadius: 6, border: "none" }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="AnáliseA"
                stroke="#3b82f6"
                strokeWidth={3}
                activeDot={{ r: 8 }}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="AnáliseB"
                stroke="#f97316"
                strokeWidth={3}
                activeDot={{ r: 8 }}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Mapa */}
        <section className="rounded-xl overflow-hidden shadow-lg mb-16 relative">
          <MapWithNoSSR points={points} onMapClick={handleMapClick} />
        </section>

        {/* Se tiver ponto selecionado mostra o formulário para intensidade */}
        {selectedCoords && (
          <section className="max-w-md mx-auto bg-zinc-900 p-6 rounded-xl shadow-lg mb-24">
            <h3 className="text-xl font-bold mb-4 text-center">
              Novo ponto selecionado
            </h3>
            <p className="mb-4 text-center">
              Latitude: {selectedCoords[0].toFixed(6)}, Longitude: {selectedCoords[1].toFixed(6)}
            </p>
            <input
              type="number"
              placeholder="Intensidade (0 a 10)"
              min={0}
              max={10}
              className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              value={intensityInput}
              onChange={(e) => setIntensityInput(e.target.value)}
            />
            <div className="flex justify-center gap-4">
              <button
                onClick={addPoint}
                className="bg-blue-600 hover:bg-blue-700 transition rounded px-6 py-3 font-semibold"
              >
                Adicionar Ponto
              </button>
              <button
                onClick={() => setSelectedCoords(null)}
                className="bg-zinc-700 hover:bg-zinc-800 transition rounded px-6 py-3 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        {/* Sobre o projeto */}
        <section className="mb-24 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Sobre o Projeto</h3>
          <p className="text-zinc-400 mb-4">
            Este projeto utiliza dados geoespaciais para mapear possíveis focos de dengue através de um mapa de calor interativo. Os dados são atualizados dinamicamente e permitem análises epidemiológicas para apoiar decisões de saúde pública.
          </p>
          <p className="text-zinc-400">
            Os pontos representam coordenadas com intensidade associada, indicando a concentração estimada dos focos. O gráfico de progressão mensal permite visualizar tendências ao longo do tempo para diferentes análises.
          </p>
        </section>
      </main>

      <footer className="bg-zinc-900 text-zinc-400 text-center py-6 mt-12 border-t border-zinc-700">
        <a href="https://github.com/ionmateus/tcc" target="_blank" className="underline hover:text-white">
          GitHub do Projeto
        </a>
      </footer>
    </div>
  );
}
