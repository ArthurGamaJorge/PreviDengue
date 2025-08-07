"use client";

import { useState, ChangeEvent } from "react";
import SimpleLineChart from "@/components/LineChart";

const chartData = {
  Campinas: [
    { month: "Jan", cases: 200 },
    { month: "Fev", cases: 220 },
    { month: "Mar", cases: 280 },
    { month: "Abr", cases: 250 },
    { month: "Mai", cases: 180 },
    { month: "Jun", cases: 150 },
    { month: "Jul", cases: 130 },
    { month: "Ago", cases: 160 },
    { month: "Set", cases: 210 },
    { month: "Out", cases: 270 },
    { month: "Nov", cases: 300 },
    { month: "Dez", cases: 260 },
  ],
  SãoPaulo: [
    { month: "Jan", cases: 800 },
    { month: "Fev", cases: 950 },
    { month: "Mar", cases: 1100 },
    { month: "Abr", cases: 1000 },
    { month: "Mai", cases: 700 },
    { month: "Jun", cases: 600 },
    { month: "Jul", cases: 550 },
    { month: "Ago", cases: 680 },
    { month: "Set", cases: 850 },
    { month: "Out", cases: 1050 },
    { month: "Nov", cases: 1200 },
    { month: "Dez", cases: 980 },
  ],
  RioDeJaneiro: [
    { month: "Jan", cases: 500 },
    { month: "Fev", cases: 620 },
    { month: "Mar", cases: 750 },
    { month: "Abr", cases: 680 },
    { month: "Mai", cases: 450 },
    { month: "Jun", cases: 300 },
    { month: "Jul", cases: 280 },
    { month: "Ago", cases: 350 },
    { month: "Set", cases: 480 },
    { month: "Out", cases: 600 },
    { month: "Nov", cases: 720 },
    { month: "Dez", cases: 590 },
  ],
};

export default function ChartSection() {
  const [selectedCity, setSelectedCity] = useState("Campinas");
  const [predictionWeeks, setPredictionWeeks] = useState(12);

  const handleCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
  };

  const handleWeeksChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPredictionWeeks(isNaN(value) ? 0 : value);
  };

  return (
    <section className="flex flex-col lg:flex-row gap-4 mb-12">
      <div className="flex-1 p-6 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800">
        <h4 className="text-xl font-bold mb-4 text-white">Análise Preditiva e Fatores de Risco</h4>
        <p className="text-zinc-400 mb-4 text-sm">
          Esta seção apresenta insights baseados em modelos de IA. Fatores ambientais como temperatura média, umidade relativa e precipitação são analisados para entender sua correlação com a incidência de casos.
        </p>
        <ul className="space-y-3 text-zinc-300 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-yellow-500 font-bold">Temperatura:</span>
            <span>Aumento de 1°C pode levar a um crescimento de 3% nos casos na próxima semana.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-500 font-bold">Precipitação:</span>
            <span>Aumento de 20mm de chuva está associado a um pico de focos 15 dias depois.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 font-bold">Densidade Populacional:</span>
            <span>Áreas com mais de 500 hab/km² tendem a ter uma propagação 40% mais rápida.</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-zinc-500">
          *Dados e correlações fictícias para demonstração.
        </p>
      </div>

      <div className="flex-3 p-6 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800">
        <h3 className="text-2xl font-bold mb-6 text-white text-center">
          Previsão de Casos de Dengue por Município
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <label htmlFor="city-select" className="text-zinc-300">
              Município:
            </label>
            <select
              id="city-select"
              value={selectedCity}
              onChange={handleCityChange}
              className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.keys(chartData).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="weeks-input" className="text-zinc-300">
              Semanas a Prever:
            </label>
            <input
              id="weeks-input"
              type="number"
              value={predictionWeeks}
              onChange={handleWeeksChange}
              min="0"
              max="52"
              className="w-20 p-2 rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <SimpleLineChart
          data={chartData[selectedCity as keyof typeof chartData]}
          predictionWeeks={predictionWeeks}
        />
      </div>

      <div className="flex-1 p-6 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800">
        <h4 className="text-xl font-bold mb-4 text-white">Plano de Ação Inteligente</h4>
        <p className="text-zinc-400 mb-4 text-sm">
          Com base na previsão e na análise de focos, o sistema sugere ações estratégicas para mitigar a propagação da dengue. Estas recomendações são personalizadas para cada município.
        </p>
        <div className="space-y-4">
          <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
            <h5 className="font-semibold text-orange-400 mb-1">Risco Iminente</h5>
            <p className="text-sm text-zinc-300">
              A cidade de Campinas apresenta um aumento previsto de 15% nos casos nas próximas 4 semanas. Recomenda-se intensificar a fiscalização em 3 bairros de alto risco.
            </p>
          </div>
          <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
            <h5 className="font-semibold text-blue-400 mb-1">Recursos Alocados</h5>
            <p className="text-sm text-zinc-300">
              Para esta semana, 12 equipes de campo e 45 agentes comunitários de saúde foram mobilizados para as áreas com maior intensidade de focos.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          *Exemplos de recomendações fictícias geradas pelo sistema.
        </p>
      </div>
    </section>
  );
}