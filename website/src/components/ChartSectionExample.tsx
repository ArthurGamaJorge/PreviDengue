import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, Bot, AlertTriangle } from 'lucide-react';
import { API_URL } from "@/lib/config";

// --- Interfaces de Tipagem para Dados da API ---
interface HistoricData {
  date: string;
  cases: number;
}

interface PredictedData {
  date: string;
  predicted_cases: number;
}

interface ApiData {
  municipality_name: string;
  historic_data: HistoricData[];
  predicted_data: PredictedData[];
}

interface Municipality {
  codigo_ibge: number;
  nome: string;
  // Outros campos do JSON podem ser adicionados aqui se necessário
}

// --- Componentes de UI (Estilo Shadcn/ui) com Tipagem ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-lg transition-all duration-300 ${className}`}>
    {children}
  </div>
);

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string; // Adicionado a propriedade className
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

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}
const CardContent = ({ children, className = '' }: CardContentProps) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

// --- Novo tipo unificado para os dados do gráfico ---
interface ChartPoint {
  date: string;
  'Casos Reais': number | null;
  'Previsão da IA': number | null;
}

const ChartSectionExample = () => {
  const [allMunicipalities, setAllMunicipalities] = useState<Municipality[]>([]);
  // Define Campinas (3509502) como valor inicial padrão
  const [selectedIbgeCode, setSelectedIbgeCode] = useState<number>(3509502); 
  const [weeksToPredict, setWeeksToPredict] = useState<number>(4);
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeeks, setCurrentWeeks] = useState<number>(4);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Efeito para buscar a lista de municípios e definir a cidade inicial
  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await fetch('/data/municipios.json');
        if (!response.ok) throw new Error("Failed to fetch municipalities data.");
        const data: Municipality[] = await response.json();
        setAllMunicipalities(data);
      } catch (e: any) {
        console.error("Erro ao carregar lista de municípios:", e);
      }
    };
    fetchMunicipalities();
  }, []);

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
        setApiData(data);
      } catch (e: any) {
        console.error("Falha ao buscar dados da API:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedIbgeCode, weeksToPredict]);

  // Memoização dos dados do gráfico
  const chartData = useMemo(() => {
    if (!apiData?.historic_data || !apiData?.predicted_data) return [];

    const formattedHistoric: ChartPoint[] = apiData.historic_data.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      'Casos Reais': d.cases,
      'Previsão da IA': null,
    }));

    const formattedPrediction: ChartPoint[] = apiData.predicted_data.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      'Casos Reais': null,
      'Previsão da IA': d.predicted_cases
    }));

    let finalChartData = [...formattedHistoric];

    if (formattedHistoric.length > 0 && formattedPrediction.length > 0) {
      const lastHistoricCases = formattedHistoric[formattedHistoric.length - 1]['Casos Reais'];
      const connectionPoint: ChartPoint = {
        date: formattedHistoric[formattedHistoric.length - 1].date,
        'Casos Reais': lastHistoricCases,
        'Previsão da IA': lastHistoricCases,
      };
      finalChartData.push(connectionPoint);
    }

    finalChartData = finalChartData.concat(formattedPrediction);
    return finalChartData;
  }, [apiData]);

  // Memoização da lista de municípios filtrados
  const filteredMunicipalities = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return allMunicipalities.filter(m => 
      m.nome.toLowerCase().startsWith(searchQuery.toLowerCase())
    );
  }, [allMunicipalities, searchQuery]);

  const handleCitySelect = (municipality: Municipality) => {
    setSelectedIbgeCode(municipality.codigo_ibge);
    setSearchQuery(municipality.nome);
    setShowDropdown(false);
  };
  
  const handleWeeksChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentWeeks(Number(e.target.value));
  };
  
  const handleSliderMouseUp = () => {
      setWeeksToPredict(currentWeeks);
  }
  
  const getMunicipalityName = (ibgeCode: number) => {
    return allMunicipalities.find(m => m.codigo_ibge === ibgeCode)?.nome || "Carregando...";
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[450px] text-zinc-400">
          <Bot className="h-12 w-12 animate-pulse text-blue-500" />
          <p className="mt-4 text-sm">Analisando dados...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[450px] text-red-400 bg-red-900/20 rounded-lg p-4">
          <AlertTriangle className="h-12 w-12" />
          <p className="mt-4 text-sm font-semibold">Erro ao carregar dados.</p>
          <p className="text-xs text-red-300 text-center">{error}</p>
        </div>
      );
    }
    if (!apiData) {
      return (
        <div className="flex flex-col items-center justify-center h-[450px] text-zinc-500">
          <p>Dados não disponíveis.</p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={450}>
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
    );
  };

  return (
    <div className="mt-6 text-zinc-300 font-sans">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle icon={BarChart3}>
            Previsão de Casos de Dengue de {getMunicipalityName(selectedIbgeCode)}
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Pesquisar cidade..."
                className="bg-zinc-800 border border-zinc-700 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
              {showDropdown && filteredMunicipalities.length > 0 && (
                <ul className="absolute z-10 w-full bg-zinc-800 border border-zinc-700 rounded-md mt-1 max-h-48 overflow-y-auto">
                  {filteredMunicipalities.map((m) => (
                    <li
                      key={m.codigo_ibge}
                      onClick={() => handleCitySelect(m)}
                      className="p-2 cursor-pointer hover:bg-zinc-700 text-sm"
                    >
                      {m.nome}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
                onChange={(e) => setCurrentWeeks(Number(e.target.value))}
                onBlur={handleSliderMouseUp}
                className="w-12 h-8 rounded-md border border-zinc-700 bg-zinc-800 text-center text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="4"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartSectionExample;