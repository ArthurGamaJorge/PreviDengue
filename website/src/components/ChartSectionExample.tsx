import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, Bot, AlertTriangle } from 'lucide-react';

// ✅ CORREÇÃO: A variável API_URL foi movida para cá para resolver o erro de importação.
// Substitua este valor pelo endereço do seu backend se for diferente.
const API_URL = "http://127.0.0.1:8000";

// --- Interfaces de Tipagem para Dados da API ---
interface HistoricData {
  date: string;
  cases: number | null;
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
  className?: string;
}
const CardHeader = ({ children, className = '' }: CardHeaderProps) => <div className={`p-6 ${className}`}>{children}</div>;

interface CardTitleProps {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}
const CardTitle = ({ children, icon: Icon }: CardTitleProps) => (
  <div className="flex items-center gap-3">
    {Icon && <Icon className="h-7 w-7 text-blue-400" />}
    <h3 className="text-xl font-bold text-white tracking-tight">{children}</h3>
  </div>
);

interface CardContentProps {
  children: React.ReactNode;
}
const CardContent = ({ children }: CardContentProps) => <div className="p-6 pt-0">{children}</div>;

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
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weeksToDisplay, setWeeksToDisplay] = useState<number>(8); // Controla a exibição
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Efeito para buscar a lista de municípios
  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        // Ajuste o caminho se o seu arquivo estiver em outro local
        const response = await fetch('/data/municipios.json');
        if (!response.ok) throw new Error("Failed to fetch municipalities data.");
        const data: Municipality[] = await response.json();
        setAllMunicipalities(data);
        // Pré-preenche o campo de busca com o nome da cidade inicial
        const initialCity = data.find(m => m.codigo_ibge === 3509502);
        if (initialCity) {
          setSearchQuery(initialCity.nome);
        }
      } catch (e: any) {
        console.error("Erro ao carregar lista de municípios:", e);
      }
    };
    fetchMunicipalities();
  }, []);

  // Efeito para buscar dados da API sempre que o município mudar
  useEffect(() => {
    if (!selectedIbgeCode) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/predict/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ibge_code: selectedIbgeCode,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        const data: ApiData = await response.json();
        setApiData(data);
      } catch (e: any)
      {
        console.error("Falha ao buscar dados da API:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedIbgeCode]);

  // Memoização dos dados do gráfico
  const chartData = useMemo(() => {
    if (!apiData?.historic_data || !apiData?.predicted_data) return [];

    const historicDataCleaned = apiData.historic_data.filter(d => d.cases !== null);

    const formattedHistoric: ChartPoint[] = historicDataCleaned.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      'Casos Reais': d.cases,
      'Previsão da IA': null,
    }));

    const slicedPrediction = apiData.predicted_data.slice(0, weeksToDisplay);

    const formattedPrediction: ChartPoint[] = slicedPrediction.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      'Casos Reais': null,
      'Previsão da IA': d.predicted_cases
    }));

    if (formattedHistoric.length > 0 && formattedPrediction.length > 0) {
      const lastHistoricPoint = formattedHistoric[formattedHistoric.length - 1];
      const connectionPoint: ChartPoint = {
        ...lastHistoricPoint,
        'Previsão da IA': lastHistoricPoint['Casos Reais'],
      };
      formattedPrediction.unshift(connectionPoint);
    }

    return [...formattedHistoric, ...formattedPrediction];
  }, [apiData, weeksToDisplay]);

  // Memoização da lista de municípios filtrados
  const filteredMunicipalities = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return allMunicipalities.filter(m => 
      m.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allMunicipalities, searchQuery]);

  const handleCitySelect = (municipality: Municipality) => {
    setSelectedIbgeCode(municipality.codigo_ibge);
    setSearchQuery(municipality.nome);
    setShowDropdown(false);
  };
  
  const handleWeeksChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWeeksToDisplay(Number(e.target.value));
  };
  
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
          <Area type="monotone" dataKey="Casos Reais" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHistoric)" strokeWidth={2} connectNulls />
          <Area type="monotone" dataKey="Previsão da IA" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPrediction)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="mt-6 text-zinc-300 font-sans">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
          <CardTitle icon={BarChart3}>
            Previsão de Casos de Dengue: {getMunicipalityName(selectedIbgeCode)}
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Pesquisar cidade..."
                className="bg-zinc-800 border border-zinc-700 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="weeks-slider" className="text-zinc-300 text-sm whitespace-nowrap">Semanas:</label>
              <input
                id="weeks-slider"
                type="range"
                min="1"
                max="8"
                value={weeksToDisplay}
                onChange={handleWeeksChange}
                className="w-full sm:w-24 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="w-12 h-8 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-white text-sm">
                {weeksToDisplay}
              </span>
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
