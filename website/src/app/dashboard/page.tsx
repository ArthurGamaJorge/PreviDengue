// app/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Header from "@/components/Header";
import KPIs from "@/components/KPIs";
import ProgressChart from "@/components/ProgressChart";
import IntensityForm from "@/components/IntensityForm";
import Footer from "@/components/Footer";

const DynamicMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
});

export default function Home() {
  const [dataPoints, setDataPoints] = useState<{ lat: number; lng: number; intensity: number }[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [intensityInput, setIntensityInput] = useState("");

  const handleMapClick = (e: [number, number]) => setSelectedCoords(e);
  const handleAddPoint = () => {
    if (!selectedCoords || intensityInput === "") return;
    const intensity = parseFloat(intensityInput);
    if (isNaN(intensity) || intensity < 0 || intensity > 10) return;
    setDataPoints([...dataPoints, { lat: selectedCoords[0], lng: selectedCoords[1], intensity }]);
    setSelectedCoords(null);
    setIntensityInput("");
  };

  const totalIntensity = dataPoints.reduce((sum, point) => sum + point.intensity, 0);
  const averageIntensity = dataPoints.length > 0 ? (totalIntensity / dataPoints.length).toFixed(2) : "0.00";

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-white pt-20 px-4 sm:px-8">
      <Header />
      <section className="text-center mt-8 mb-12 max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold mb-4">Análise Inteligente de Focos</h2>
        <p className="text-zinc-400 text-lg">
          Visualize e adicione pontos de intensidade de focos de dengue no mapa interativo.
        </p>
      </section>
      <KPIs totalCases={totalIntensity} pointCount={dataPoints.length} avgIntensity={averageIntensity} />
      <div className="max-w-6xl mx-auto mb-12 rounded-xl overflow-hidden shadow-lg border border-zinc-800">
        <DynamicMap onMapClick={handleMapClick} points={dataPoints} />
      </div>
      {selectedCoords && (
        <IntensityForm
          selectedCoords={selectedCoords}
          intensityInput={intensityInput}
          onChange={setIntensityInput}
          onAdd={handleAddPoint}
          onCancel={() => setSelectedCoords(null)}
        />
      )}
      <ProgressChart />
      <Footer />
    </main>
  );
}
