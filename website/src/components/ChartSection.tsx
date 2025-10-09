"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  MapPin,
  AlertTriangle,
  Lightbulb,
  BrainCircuit,
  BarChart3,
  Bot,
  Bell,
  ActivitySquare,
  CheckCircle,
  Car,
  Download,
  HandPlatter,
  Frown,
  XCircle,
  ChevronUp,
  ChevronDown,
  Flame,
  Flag,
  Users,
  Leaf,
  Umbrella,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { API_URL } from "@/lib/config";

const PdfButton = dynamic(() => import("./PdfButton").then((mod) => mod.PdfButton), {
  ssr: false,
  loading: () => (
    <button
      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-zinc-500 text-white font-semibold rounded-md cursor-wait"
      disabled
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      Carregando PDF...
    </button>
  ),
});

interface TippingPoint {
  factor: string;
  value: string;
}

interface Insights {
  strategic_summary: string;
  lag_analysis_plot_base64: string;
  tipping_points: TippingPoint[];
}

interface HistoricData {
  date: string;
  cases: number;
}

interface PredictedData {
  date: string;
  predicted_cases: number;
}

interface Alert {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface ApiData {
  municipality_name: string;
  historic_data: HistoricData[];
  predicted_data: PredictedData[];
  insights: Insights;
  alerts: Alert[];
}

interface DataPoint {
  lat: number;
  lng: number;
  intensity: number;
  imageFilename: string | null;
  imageBase64: string;
  detectedObjects: Record<string, number>;
}

interface NominatimAddress {
  display_name: string;
  address: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  name?: string;
}

type RiskLevel = "Alto" | "Médio" | "Baixo";

interface PrioritizedAddress {
  name: string;
  coords: string;
  risk_level: RiskLevel;
  main_risk_factor: string;
}

const MUNICIPALITIES = [
  { name: "Campinas", ibge_code: 3509502 },
  { name: "São Paulo", ibge_code: 3550308 },
  { name: "Sumaré", ibge_code: 3552403 },
  { name: "Rio de Janeiro", ibge_code: 3304557 },
  { name: "Belo Horizonte", ibge_code: 3106200 },
];

const mockAlerts: Alert[] = [
  {
    title: "Previsão de Chuva Forte",
    description:
      "Prepare-se para agir: a IA prevê um aumento de casos nas próximas semanas, relacionado ao volume de chuva.",
    severity: "high",
  },
  {
    title: "Casos Estáveis",
    description: "Sem picos de alerta. Continue as ações de rotina, mas mantenha a vigilância.",
    severity: "low",
  },
  {
    title: "Atenção nos Bairros Centrais",
    description:
      "A IA identificou maior sensibilidade climática nestas áreas. Redobre a atenção nas visitas de campo.",
    severity: "medium",
  },
];

interface ChartPoint {
  date: string;
  dateObj?: Date;
  "Casos Reais": number | null;
  "Previsão da IA": number | null;
}

interface ChartSectionProps {
  municipalityIbgeCode?: number;
  mapDataPoints: DataPoint[];
}

const ChartSection = ({ municipalityIbgeCode, mapDataPoints }: ChartSectionProps) => {
  const defaultIbge = MUNICIPALITIES.find((m) => m.name === "Campinas")?.ibge_code || MUNICIPALITIES[0].ibge_code;
  const selectedIbgeCode = municipalityIbgeCode || defaultIbge;

  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<"Todos" | "Alto" | "Médio" | "Baixo">("Todos");
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);
  const [prioritizedAddresses, setPrioritizedAddresses] = useState<PrioritizedAddress[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(API_URL + "/predict/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ibge_code: selectedIbgeCode,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
        }
        const data: ApiData = await response.json();
        setApiData({ ...data, alerts: mockAlerts });
      } catch (e: any) {
        console.error("Falha ao buscar dados da API:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedIbgeCode]);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (mapDataPoints.length === 0) {
        setPrioritizedAddresses([]);
        return;
      }
      setLoadingAddresses(true);

      const addresses = await Promise.all(
        mapDataPoints.map(async (point) => {
          let risk_level: RiskLevel = "Baixo";
          if (point.intensity >= 7) {
            risk_level = "Alto";
          } else if (point.intensity >= 4) {
            risk_level = "Médio";
          }

          let locationName = `Lat: ${point.lat.toFixed(4)}, Lng: ${point.lng.toFixed(4)}`;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lng}`
            );
            const data: NominatimAddress = await response.json();
            if (data.name) {
              locationName = data.name;
            } else if (data.address.road) {
              locationName = data.address.road;
            } else if (data.address.neighbourhood) {
              locationName = data.address.neighbourhood;
            } else {
              locationName = data.display_name.split(",")[0];
            }
          } catch (e) {
            console.error("Failed to fetch address:", e);
          }

          return {
            name: locationName,
            coords: `Lat: ${point.lat.toFixed(4)}, Lng: ${point.lng.toFixed(4)}`,
            risk_level,
            main_risk_factor: `Pontos detectados pela IA`,
          };
        })
      );
      setPrioritizedAddresses(addresses);
      setLoadingAddresses(false);
    };
    fetchAddresses();
  }, [mapDataPoints]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!apiData?.historic_data || !apiData?.predicted_data) return [];

    const parseDate = (d: string) => {
      const parts = d.split("-");
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    };

    const fmt = (dateObj: Date) =>
      dateObj.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });

    const historic = apiData.historic_data.map((h) => ({
      dateObj: parseDate(h.date),
      dateLabel: fmt(parseDate(h.date)),
      cases: h.cases,
    }));

    const lastValidHistoricPoint = [...historic].reverse().find((d) => d.cases !== null && d.cases !== undefined);
    if (!lastValidHistoricPoint) return [];

    const lastValidDateObj = lastValidHistoricPoint.dateObj;
    const lastValidValue = lastValidHistoricPoint.cases;

    const indexLastHistoric = historic.findIndex((h) => h.dateObj.getTime() === lastValidDateObj.getTime());
    const formattedHistoric: ChartPoint[] = historic
      .slice(0, indexLastHistoric + 1)
      .map((d) => ({
        date: fmt(d.dateObj),
        dateObj: d.dateObj,
        "Casos Reais": d.cases,
        "Previsão da IA": null,
      }));

    const predictedRaw = apiData.predicted_data.map((p) => ({ ...p }));

    const predictedMapped: ChartPoint[] = [];
    const syntheticStartDate = new Date(lastValidDateObj.getTime() + 24 * 3600 * 1000);
    predictedMapped.push({
      date: fmt(syntheticStartDate),
      dateObj: syntheticStartDate,
      "Casos Reais": null,
      "Previsão da IA": lastValidValue,
    });

    for (let i = 0; i < predictedRaw.length; i++) {
      const dateObj = new Date(lastValidDateObj.getTime() + 7 * 24 * 3600 * 1000 * (i + 1));
      predictedMapped.push({
        date: fmt(dateObj),
        dateObj: dateObj,
        "Casos Reais": null,
        "Previsão da IA": predictedRaw[i].predicted_cases,
      });
    }

    const combined = [...formattedHistoric, ...predictedMapped];

    const todayObj = new Date();
    const todayLabel = fmt(todayObj);
    const existsToday = combined.some((c) => c.date === todayLabel);
    if (!existsToday) {
      const insertIndex = combined.findIndex((c) => c.dateObj && c.dateObj.getTime() > todayObj.getTime());
      const todayPoint: ChartPoint = {
        date: todayLabel,
        dateObj: todayObj,
        "Casos Reais": null,
        "Previsão da IA": null,
      };
      if (insertIndex === -1) combined.push(todayPoint);
      else combined.splice(insertIndex, 0, todayPoint);
    }

    combined.sort((a, b) => {
      const ta = a.dateObj ? a.dateObj.getTime() : 0;
      const tb = b.dateObj ? b.dateObj.getTime() : 0;
      return ta - tb;
    });

    return combined.map(({ date, "Casos Reais": cr, "Previsão da IA": pr }) => ({
      date,
      "Casos Reais": cr ?? null,
      "Previsão da IA": pr ?? null,
    }));
  }, [apiData]);

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case "Alto":
        return "bg-rose-500";
      case "Médio":
        return "bg-amber-500";
      case "Baixo":
        return "bg-emerald-500";
    }
  };

  const filteredAddresses = useMemo(() => {
    if (filterRisk === "Todos") return prioritizedAddresses;
    return prioritizedAddresses.filter((addr) => addr.risk_level === filterRisk);
  }, [filterRisk, prioritizedAddresses]);

  const highIntensityPointsCount = useMemo(() => mapDataPoints.filter((p) => p.intensity >= 7).length, [mapDataPoints]);

  const highIntensityPercentage = useMemo(() => {
    if (mapDataPoints.length === 0) return 0;
    return (highIntensityPointsCount / mapDataPoints.length) * 100;
  }, [highIntensityPointsCount, mapDataPoints.length]);

  const isMutiraoNeeded = highIntensityPercentage > 5;

  const trend = useMemo(() => {
    if (!apiData) return "indefinida";
    const last6Historic = apiData.historic_data.slice(-6).reduce((s, d) => s + (d.cases || 0), 0);
    const predictedSum = apiData.predicted_data.reduce((s, d) => s + (d.predicted_cases || 0), 0);
    const difference = predictedSum - last6Historic;
    const perc = last6Historic === 0 ? 100 : (Math.abs(difference) / last6Historic) * 100;
    if (perc <= 50) return "estável";
    if (difference > 0) return "crescente";
    if (difference < 0) return "decrescente";
    return "indefinida";
  }, [apiData]);

  const renderContent = () => {
    if (loading || loadingAddresses) {
      return (
        <div className="flex flex-col items-center justify-center h-[500px] text-zinc-400">
          <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          <p className="mt-4 text-lg">Aguarde, os dados estão sendo processados...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[500px] text-red-400 bg-red-900/20 rounded-lg p-6">
          <AlertTriangle className="h-16 w-16" />
          <p className="mt-4 text-lg font-semibold">Erro ao carregar análise</p>
          <p className="text-sm text-red-300 text-center">{error}</p>
        </div>
      );
    }
    if (!apiData) {
      return (
        <div className="flex flex-col items-center justify-center h-[500px] text-zinc-500">
          <p>Selecione um município para iniciar a análise.</p>
        </div>
      );
    }

    const addressesForPdf = prioritizedAddresses;
    const todayLabel = new Date().toLocaleDateString("pt-BR", { month: "short", day: "numeric" });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        <div className="col-span-1 flex flex-col">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg transition-all duration-300 h-full flex flex-col justify-between p-6 border-red-600/50 bg-red-900/10">
            <div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-7 w-7 text-blue-400" />
                <h3 className="text-xl font-bold text-white tracking-tight">Painel de Alertas</h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1.5">Sinais importantes para guiar suas ações.</p>
              <div className="mt-6 space-y-4">
                <div className="bg-orange-800/10 border border-orange-600/50 p-4 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-orange-800/80 p-2 rounded-full">
                      {trend === "crescente" && <TrendingUp className="h-6 w-6 text-orange-400" />}
                      {trend === "decrescente" && <TrendingDown className="h-6 w-6 text-emerald-400" />}
                      {trend === "estável" && <Minus className="h-6 w-6 text-blue-400" />}
                      {trend === "indefinida" && <BrainCircuit className="h-6 w-6 text-zinc-400" />}
                    </div>
                    <p className="font-semibold text-white">Tendência de Casos: {trend.toUpperCase()}</p>
                  </div>
                  <p className="text-sm text-zinc-300">
                    A análise de previsão indica que o número de casos na região está em uma tendência <strong>{trend}</strong>.
                  </p>
                </div>

                {isMutiraoNeeded && (
                  <div className="bg-green-800/10 border border-green-600/50 p-4 rounded-lg flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 bg-green-800/80 p-2 rounded-full">
                        <Users className="h-6 w-6 text-green-400" />
                      </div>
                      <p className="font-semibold text-white">Mobilização e Mutirões</p>
                    </div>
                    <p className="text-sm text-zinc-300">
                      O número de focos de alto risco na cidade é alarmante. A mobilização de mutirões de limpeza é essencial.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg transition-all duration-300 h-full">
            <div className="p-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-blue-400" />
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Previsão de Casos de Dengue de {apiData.municipality_name}
                </h3>
              </div>
            </div>
            <div className="p-6 pt-0">
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorHistoric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.9)",
                      borderColor: "#374151",
                      color: "#d1d5db",
                      borderRadius: "0.75rem",
                    }}
                    formatter={(value: any, name: any) => {
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "14px" }} />
                  <ReferenceLine
                    x={todayLabel}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    label={{ value: "HOJE", position: "top", fill: "#f43f5e", fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Casos Reais"
                    name="Casos Reais"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorHistoric)"
                    strokeWidth={2}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="Previsão da IA"
                    name="Previsão da IA"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorPrediction)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-span-1 flex flex-col">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg transition-all duration-300 h-full flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center gap-3">
                <Lightbulb className="h-7 w-7 text-blue-400" />
                <h3 className="text-xl font-bold text-white tracking-tight">Painel de Informações</h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1.5">Análise detalhada da previsão da IA.</p>
              <div className="mt-6 space-y-4">
                <div className="bg-zinc-800/50 p-4 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-zinc-700 p-2 rounded-full">
                      <BrainCircuit className="h-6 w-6 text-indigo-400" />
                    </div>
                    <p className="font-semibold text-white">Análise de Fatores</p>
                  </div>
                  <p className="text-sm text-zinc-300">A IA identificou que os principais fatores de risco para picos de dengue na sua região são:</p>
                  <ul className="space-y-2 text-sm text-zinc-400 pl-4 list-disc">
                    {apiData.insights.tipping_points.map((point, index) => (
                      <li key={index} className="text-left">
                        <p>
                          <span className="font-semibold text-zinc-200">{point.factor}</span>: {point.value}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-zinc-800/50 p-4 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-zinc-700 p-2 rounded-full">
                      <Car className="h-6 w-6 text-green-400" />
                    </div>
                    <p className="font-semibold text-white">Áreas Prioritárias</p>
                  </div>
                  <p className="text-sm text-zinc-300">Clique para filtrar por nível de risco e gerar o relatório.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterRisk("Todos")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        filterRisk === "Todos" ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilterRisk("Alto")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        filterRisk === "Alto" ? "bg-rose-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      Alto
                    </button>
                    <button
                      onClick={() => setFilterRisk("Médio")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        filterRisk === "Médio" ? "bg-amber-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      Médio
                    </button>
                    <button
                      onClick={() => setFilterRisk("Baixo")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        filterRisk === "Baixo" ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      Baixo
                    </button>
                  </div>

                  {loadingAddresses ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <ul className="space-y-2 text-sm pr-2 overflow-y-auto h-40">
                      {filteredAddresses.map((address, index) => (
                        <li key={index} className="flex justify-between items-center border-b border-zinc-700 pb-2 last:border-b-0">
                          <p className="font-semibold text-zinc-200">{address.name}</p>
                          <span className={`h-2.5 w-2.5 rounded-full ${getRiskColor(address.risk_level)}`} title={`Risco ${address.risk_level}`}></span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {apiData && addressesForPdf.length > 0 && <PdfButton municipalityName={apiData.municipality_name} addresses={addressesForPdf} />}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-auto italic text-center pt-6"></p>
          </div>
        </div>
      </div>
    );
  };

  return <div className="min-h-screen text-zinc-300 font-sans px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">{renderContent()}</div>;
};

export default ChartSection;
