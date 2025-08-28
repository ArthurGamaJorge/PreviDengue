"use client";

import React, { useState, useEffect, useMemo, ChangeEvent, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MapPin, AlertTriangle, Lightbulb, BrainCircuit, BarChart3, CalendarClock, Bot, Bell, ActivitySquare, CheckCircle, Car, Download, HandPlatter, Frown, XCircle, ChevronUp, ChevronDown, Flame, Flag, Users, Leaf, Umbrella, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { API_URL } from "@/lib/config";
import { Console } from 'console';

// --- Importação Dinâmica do PdfButton ---
const PdfButton = dynamic(() => import('./PdfButton').then(mod => mod.PdfButton), { 
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

// --- Interfaces de Tipagem para Dados da API ---
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
  severity: 'low' | 'medium' | 'high';
}

interface ApiData {
  municipality_name: string;
  historic_data: HistoricData[];
  predicted_data: PredictedData[];
  insights: Insights;
  alerts: Alert[];
}

// Interfaces para os dados do mapa
interface DataPoint {
  lat: number;
  lng: number;
  intensity: number;
  imageFilename: string | null;
  imageBase64: string;
  detectedObjects: Record<string, number>;
}

// Interfaces da API Nominatim
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

type RiskLevel = 'Alto' | 'Médio' | 'Baixo';

interface PrioritizedAddress {
    name: string;
    coords: string;
    risk_level: RiskLevel;
    main_risk_factor: string;
}

// --- Dados de Configuração ---
const MUNICIPALITIES = [
  { name: 'Campinas', ibge_code: 3509502 },
  { name: 'São Paulo', ibge_code: 3550308 },
  { name: 'Sumaré', ibge_code: 3552403 },
  { name: 'Rio de Janeiro', ibge_code: 3304557 },
  { name: 'Belo Horizonte', ibge_code: 3106200 },
];

const mockAlerts: Alert[] = [
  {
    title: "Previsão de Chuva Forte",
    description: "Prepare-se para agir: a IA prevê um aumento de casos nas próximas semanas, relacionado ao volume de chuva.",
    severity: 'high',
  },
  {
    title: "Casos Estáveis",
    description: "Sem picos de alerta. Continue as ações de rotina, mas mantenha a vigilância.",
    severity: 'low',
  },
  {
    title: "Atenção nos Bairros Centrais",
    description: "A IA identificou maior sensibilidade climática nestas áreas. Redobre a atenção nas visitas de campo.",
    severity: 'medium',
  },
];

// --- Componentes de UI (Estilo Shadcn/ui) com Tipagem ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg transition-all duration-300 ${className}`}>
    {children}
  </div>
);

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}
const CardHeader = ({ children, className = '' }: CardHeaderProps) => <div className={`p-6 ${className}`}>{children}</div>;

interface CardTitleProps {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}
const CardTitle = ({ children, icon: Icon, className = '' }: CardTitleProps) => (
  <div className="flex items-center gap-3">
    {Icon && <Icon className={`h-7 w-7 text-blue-400 ${className}`} />}
    <h3 className={`text-xl font-bold text-white tracking-tight ${className}`}>{children}</h3>
  </div>
);

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}
const CardDescription = ({ children, className = '' }: CardDescriptionProps) => <p className={`text-sm text-zinc-400 mt-1.5 ${className}`}>{children}</p>;

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}
const CardContent = ({ children, className = '' }: CardContentProps) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

// -------------------------------------------------------------------------------------------------

// --- Novo tipo unificado para os dados do gráfico ---
// Define a single type that can handle both historic and predicted data
interface ChartPoint {
  date: string;
  'Casos Reais': number | null;
  'Previsão da IA': number | null;
}

// --- Props do componente App ---
interface ChartSectionProps {
  municipalityIbgeCode?: number; 
  mapDataPoints: DataPoint[]; 
}

// --- Componente Principal do Dashboard ---
const ChartSection = ({ municipalityIbgeCode, mapDataPoints }: ChartSectionProps) => {
  // Define Campinas como padrão caso o prop não seja fornecido
  const defaultIbge = MUNICIPALITIES.find(m => m.name === 'Campinas')?.ibge_code || MUNICIPALITIES[0].ibge_code;
  const selectedIbgeCode = municipalityIbgeCode || defaultIbge;

  const [weeksToPredict, setWeeksToPredict] = useState<number>(4);
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<'Todos' | 'Alto' | 'Médio' | 'Baixo'>('Todos');
  const [currentWeeks, setCurrentWeeks] = useState<number>(4);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);

  // Estado para armazenar os endereços com base nas coordenadas
  const [prioritizedAddresses, setPrioritizedAddresses] = useState<PrioritizedAddress[]>([]);

  // Efeito para buscar dados da API sempre que o município ou semanas mudarem
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(API_URL + '/predict/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ibge_code: selectedIbgeCode,
            weeks_to_predict: weeksToPredict,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
        }
        const data: ApiData = await response.json();
        console.log(data)
        setApiData({ ...data, alerts: mockAlerts });
      } catch (e: any) {
        console.error("Falha ao buscar dados da API:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedIbgeCode, weeksToPredict]);

  // Efeito para buscar endereços com base nas coordenadas do mapa
  useEffect(() => {
    const fetchAddresses = async () => {
      if (mapDataPoints.length === 0) {
          setPrioritizedAddresses([]);
          return;
      }
      setLoadingAddresses(true);

      const addresses = await Promise.all(
          mapDataPoints.map(async (point) => {
              let risk_level: RiskLevel = 'Baixo';
              if (point.intensity >= 7) {
                  risk_level = 'Alto';
              } else if (point.intensity >= 4) {
                  risk_level = 'Médio';
              }

              let locationName = `Lat: ${point.lat.toFixed(4)}, Lng: ${point.lng.toFixed(4)}`;
              try {
                  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lng}`);
                  const data: NominatimAddress = await response.json();
                  
                  if (data.name) {
                      locationName = data.name;
                  } else if (data.address.road) {
                      locationName = data.address.road;
                  } else if (data.address.neighbourhood) {
                      locationName = data.address.neighbourhood;
                  } else {
                      locationName = data.display_name.split(',')[0];
                  }

              } catch (e) {
                  console.error("Failed to fetch address:", e);
              }

              return {
                  name: locationName,
                  coords: `Lat: ${point.lat.toFixed(4)}, Lng: ${point.lng.toFixed(4)}`,
                  risk_level,
                  main_risk_factor: `Pontos detectados pela IA`
              };
          })
      );
      setPrioritizedAddresses(addresses);
      setLoadingAddresses(false);
    };

    fetchAddresses();
  }, [mapDataPoints]);

  const chartData = useMemo(() => {
    if (!apiData?.historic_data || !apiData?.predicted_data) {
        return [];
    }

    // Filtra os dados de previsão para mostrar apenas o número de semanas selecionado
    // Isso garante que o gráfico sempre corresponda ao slider
    const predictedWeeks = apiData.predicted_data.slice(0, currentWeeks);
    
    // Encontra o último ponto de dados histórico com um valor de 'cases' válido
    const lastValidHistoricPoint = apiData.historic_data.slice().reverse().find(d => d.cases !== null && d.cases !== undefined);

    // Se não houver dados históricos válidos ou previsão, retorna um array vazio
    if (!lastValidHistoricPoint || predictedWeeks.length === 0) {
        return [];
    }
    
    // A data do último ponto válido e seu valor
    const lastValidHistoricDate = new Date(lastValidHistoricPoint.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    const lastValidHistoricValue = lastValidHistoricPoint.cases;
    
    // Os dados históricos formatados até o último ponto válido
    const formattedHistoric = apiData.historic_data
        .slice(0, apiData.historic_data.indexOf(lastValidHistoricPoint) + 1)
        .map(d => ({
            date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
            'Casos Reais': d.cases,
            'Previsão da IA': null,
        }));
    
    // O primeiro ponto de previsão
    const firstPredictedPoint = predictedWeeks[0];
    
    // O ponto de conexão entre os dados históricos e a previsão
    const connectionPoint = {
        date: new Date(firstPredictedPoint.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        'Casos Reais': lastValidHistoricValue,
        'Previsão da IA': firstPredictedPoint.predicted_cases,
    };
    
    // O restante dos dados de previsão
    const remainingPredictedData = predictedWeeks.slice(1).map(d => ({
        date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        'Casos Reais': null,
        'Previsão da IA': d.predicted_cases,
    }));
    
    // Combina os dados na ordem correta
    return [...formattedHistoric, connectionPoint, ...remainingPredictedData];
    
}, [apiData, currentWeeks]);

  
  const handleWeeksChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentWeeks(Number(e.target.value));
  };
  
  const handleSliderMouseUp = () => {
      setWeeksToPredict(currentWeeks);
  }

  const getRiskColor = (risk: RiskLevel) => {
    switch(risk) {
        case 'Alto': return 'bg-rose-500';
        case 'Médio': return 'bg-amber-500';
        case 'Baixo': return 'bg-emerald-500';
    }
  };

  const filteredAddresses = useMemo(() => {
    if (filterRisk === 'Todos') {
      return prioritizedAddresses;
    }
    return prioritizedAddresses.filter(addr => addr.risk_level === filterRisk);
  }, [filterRisk, prioritizedAddresses]);

  // LÓGICA DE ALERTA DINÂMICA
  const highIntensityPointsCount = useMemo(() => {
    return mapDataPoints.filter(p => p.intensity >= 7).length;
  }, [mapDataPoints]);

  const highIntensityPercentage = useMemo(() => {
    if (mapDataPoints.length === 0) return 0;
    return (highIntensityPointsCount / mapDataPoints.length) * 100;
  }, [highIntensityPointsCount, mapDataPoints.length]);

  const isMutiraoNeeded = highIntensityPercentage > 5;

  const trend = useMemo(() => {
    if (!apiData || !apiData.predicted_data || apiData.historic_data.length < currentWeeks) return 'indefinida';

    const historicScore = apiData.historic_data.slice(-currentWeeks).reduce((sum, d) => sum + d.cases, 0);
    const predictedScore = apiData.predicted_data.slice(0, currentWeeks).reduce((sum, d) => sum + d.predicted_cases, 0);

    const difference = Math.abs(predictedScore - historicScore);
    const percentageDifference = (historicScore === 0) ? 100 : (difference / historicScore) * 100;

    if (percentageDifference <= 50) return 'estável';
    if (predictedScore > historicScore) return 'crescente';
    if (predictedScore < historicScore) return 'decrescente';

    return 'indefinida';
  }, [apiData, currentWeeks]);

  const isPeakPredicted = useMemo(() => {
    if (!apiData || !apiData.predicted_data || apiData.historic_data.length < 3) return false;
    const lastPredicted = apiData.predicted_data[apiData.predicted_data.length - 1].predicted_cases;
    const lastHistoric = apiData.historic_data.slice(-3).reduce((sum, d) => sum + d.cases, 0) / 3;
    return lastPredicted > lastHistoric * 1.5;
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
    
    // Apenas os endereços do filtro atual serão passados para o PDF
    const addressesForPdf = prioritizedAddresses;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Painel da Esquerda: Painel de Alertas */}
        <div className="col-span-1 flex flex-col">
          <Card className="h-full flex flex-col justify-between p-6 border-red-600/50 bg-red-900/10">
            <div>
              <CardTitle icon={AlertTriangle} className="text-red-400">Painel de Alertas</CardTitle>
              <CardDescription className="text-red-300">Sinais importantes para guiar suas ações.</CardDescription>
              <div className="mt-6 space-y-4">
                {/* Alerta de Pico (opcional) */}
                {isPeakPredicted && (
                  <div className="bg-red-900/10 border border-red-600/50 p-4 rounded-lg flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 bg-red-800/80 p-2 rounded-full">
                        <Flame className="h-6 w-6 text-red-400" />
                      </div>
                      <p className="font-semibold text-white">Previsão de Pico de Casos</p>
                    </div>
                    <p className="text-sm text-zinc-300">
                      Nossa IA prevê um pico de casos de dengue nas próximas semanas. Prepare-se para agir de forma estratégica.
                    </p>
                  </div>
                )}
                
                {/* Alerta de Tendência */}
                <div className="bg-orange-800/10 border border-orange-600/50 p-4 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-orange-800/80 p-2 rounded-full">
                      {trend === 'crescente' && <TrendingUp className="h-6 w-6 text-orange-400" />}
                      {trend === 'decrescente' && <TrendingDown className="h-6 w-6 text-emerald-400" />}
                      {trend === 'estável' && <Minus className="h-6 w-6 text-blue-400" />}
                      {trend === 'indefinida' && <BrainCircuit className="h-6 w-6 text-zinc-400" />}
                    </div>
                    <p className="font-semibold text-white">Tendência de Casos: {trend.toUpperCase()}</p>
                  </div>
                  <p className="text-sm text-zinc-300">
                    A análise de previsão indica que o número de casos na região está em uma tendência **{trend}**.
                  </p>
                </div>
                
                {/* Card de Mutirões (opcional) */}
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
          </Card>
        </div>

        {/* Coluna Central: Gráfico de Previsão (bem mais largo) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle icon={BarChart3}>
                Previsão de Casos de Dengue de {apiData.municipality_name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <label htmlFor="weeks-slider" className="text-zinc-300 text-sm whitespace-nowrap">Prever Semanas:</label>
                <input
                  id="weeks-slider"
                  type="range"
                  min="1"
                  max="4"
                  value={currentWeeks}
                  onChange={handleWeeksChange}
                  onMouseUp={handleSliderMouseUp}
                  onTouchEnd={handleSliderMouseUp}
                  className="w-24 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <input
                  type="number"
                  value={currentWeeks}
                  onChange={handleWeeksChange}
                  className="w-12 h-8 rounded-md border border-zinc-700 bg-zinc-800 text-center text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="4"
                />
              </div>
            </CardHeader>
            <CardContent>
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
                      backgroundColor: 'rgba(17, 24, 39, 0.9)',
                      borderColor: '#374151',
                      color: '#d1d5db',
                      borderRadius: '0.75rem'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "14px" }} />
                  <Area type="monotone" dataKey="Casos Reais" name="Casos Reais" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHistoric)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Previsão da IA" name="Previsão da IA" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPrediction)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Painel da Direita: Painel de Informações */}
        <div className="col-span-1 flex flex-col">
          <Card className="h-full flex flex-col justify-between p-6">
            <div>
              <CardTitle icon={Lightbulb}>Painel de Informações</CardTitle>
              <CardDescription>Análise detalhada da previsão da IA.</CardDescription>
              <div className="mt-6 space-y-4">
                <div className="bg-zinc-800/50 p-4 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-zinc-700 p-2 rounded-full">
                      <BrainCircuit className="h-6 w-6 text-indigo-400" />
                    </div>
                    <p className="font-semibold text-white">Análise de Fatores</p>
                  </div>
                  <p className="text-sm text-zinc-300">
                    A IA identificou que os principais fatores de risco para picos de dengue na sua região são:
                  </p>
                  <ul className="space-y-2 text-sm text-zinc-400 pl-4 list-disc">
                    {apiData.insights.tipping_points.map((point, index) => (
                      <li key={index} className="text-left">
                        <p><span className="font-semibold text-zinc-200">{point.factor}</span>: {point.value}</p>
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
                  <CardDescription>Clique para filtrar por nível de risco e gerar o relatório.</CardDescription>
                  <div className="flex gap-2">
                    <button onClick={() => setFilterRisk('Todos')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterRisk === 'Todos' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>Todos</button>
                    <button onClick={() => setFilterRisk('Alto')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterRisk === 'Alto' ? 'bg-rose-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>Alto</button>
                    <button onClick={() => setFilterRisk('Médio')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterRisk === 'Médio' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>Médio</button>
                    <button onClick={() => setFilterRisk('Baixo')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterRisk === 'Baixo' ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>Baixo</button>
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
                  {apiData && addressesForPdf.length > 0 && (
                    <PdfButton 
                      municipalityName={apiData.municipality_name} 
                      addresses={addressesForPdf} 
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-auto italic text-center pt-6"></p>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-zinc-300 font-sans px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">   
       <div className="mb-8"></div>
       {renderContent()}
    </div>
  );
};

export default ChartSection;