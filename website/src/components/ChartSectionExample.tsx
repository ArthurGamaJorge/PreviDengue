import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { BarChart3, Bot, AlertTriangle } from 'lucide-react';
import { API_URL } from "@/lib/config";
// ✅ CORREÇÃO: A variável API_URL foi movida para cá para resolver o erro de importação.

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
  codigo_uf: number;
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
  // Previsão sempre fixa em 6 semanas
  const weeksToDisplay = 6;
  // Controle do histórico visível (em semanas) - sempre uma quantidade fixa (sem opção "tudo")
  const [historyWeeks, setHistoryWeeks] = useState<number>(52);
  const [maxHistoryWeeks, setMaxHistoryWeeks] = useState<number>(600);
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
          body: JSON.stringify({ ibge_code: selectedIbgeCode })
        });

        if (!response.ok) {
          let errMsg = `HTTP error! status: ${response.status}`;
          try {
            const errData = await response.json();
            if (errData?.error) errMsg = errData.error;
          } catch {}
          throw new Error(errMsg);
        }
  const data: ApiData = await response.json();
  setApiData(data);
  // Atualiza o máximo de semanas baseado no histórico disponível
  const count = (data.historic_data || []).filter(d => d.cases !== null).length;
  if (count > 0) setMaxHistoryWeeks(count);
      } catch (e: any) {
        console.error('Falha ao buscar dados da API:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedIbgeCode]);

  // (o efeito de busca por município está mais abaixo, limpo e funcional)

  // Memoização dos dados do gráfico
  const chartData = useMemo(() => {
    if (!apiData?.historic_data || !apiData?.predicted_data) return [];

    const historicDataCleaned = apiData.historic_data.filter(d => d.cases !== null);
    // Limita o histórico visível com base em historyWeeks (0 ou valor grande para mostrar tudo)
    const limitedHistoric = historyWeeks > 0 ? historicDataCleaned.slice(-historyWeeks) : historicDataCleaned;

    const formattedHistoric: ChartPoint[] = limitedHistoric.map(d => ({
      date: d.date, // manter ISO para formatar no eixo/tooltip
      'Casos Reais': d.cases,
      'Previsão da IA': null,
    }));

    const slicedPrediction = apiData.predicted_data.slice(0, weeksToDisplay);

    const formattedPrediction: ChartPoint[] = slicedPrediction.map(d => ({
      date: d.date,
      'Casos Reais': null,
      'Previsão da IA': d.predicted_cases
    }));

    if (formattedHistoric.length > 0) {
      const lastHistoricPoint = formattedHistoric[formattedHistoric.length - 1];
      // Preenche o último ponto do histórico também com o valor inicial da previsão
      if (lastHistoricPoint['Previsão da IA'] == null) {
        lastHistoricPoint['Previsão da IA'] = lastHistoricPoint['Casos Reais'] ?? 0;
      }
    }

    return [...formattedHistoric, ...formattedPrediction];
  }, [apiData, historyWeeks]);

  // Ticks de eixo X: somente 1 por mês (evita repetição); ano em negrito nas viradas (janeiro)
  const monthTicks = useMemo(() => {
    const seen = new Set<string>(); // key: YYYY-MM
    const ticks: string[] = [];
    for (const pt of chartData) {
      const d = new Date(pt.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!seen.has(key)) {
        seen.add(key);
        ticks.push(pt.date);
      }
    }
    return ticks;
  }, [chartData]);

  const CustomMonthYearTick = (props: any) => {
    const { x, y, payload } = props;
    const d = new Date(payload.value);
    if (isNaN(d.getTime())) return null;
    const isJanuary = d.getMonth() === 0;
    const text = isJanuary
      ? String(d.getFullYear())
      : d.toLocaleString('pt-BR', { month: 'short' });
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={16} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight={isJanuary ? 700 : 400}>
          {text}
        </text>
      </g>
    );
  };

  // Ticks anuais (primeiro ponto de cada ano) para um eixo superior dedicado
  const yearTicks = useMemo(() => {
    const firstByYear = new Map<number, string>();
    for (const pt of chartData) {
      const d = new Date(pt.date);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      if (!firstByYear.has(y)) firstByYear.set(y, pt.date);
    }
    return Array.from(firstByYear.values());
  }, [chartData]);

  const YearTick = ({ x, y, payload }: any) => {
    const d = new Date(payload.value);
    if (isNaN(d.getTime())) return null;
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={-4} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight={700}>
          {String(d.getFullYear())}
        </text>
      </g>
    );
  };

  // Marcadores de início de ano (destacados, sem duplicatas)
  const yearMarkers = useMemo(() => {
    const markers: { date: string; year: number }[] = [];
    const seen = new Set<number>();
    for (const pt of chartData) {
      const dt = new Date(pt.date);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        if (!seen.has(y)) {
          seen.add(y);
          markers.push({ date: pt.date, year: y });
        }
      }
    }
    return markers;
  }, [chartData]);

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
  
  const handleHistoryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setHistoryWeeks(Number(e.target.value));
  };

  // Formatação dos ticks do eixo X: mostrar meses; quando for início do ano, mostrar o ano
  const monthTickFormatter = (value: string) => {
    const dt = new Date(value);
    const month = dt.getMonth();
    return month === 0
      ? dt.getFullYear().toString()
      : dt.toLocaleString('pt-BR', { month: 'short' });
  };

  // Tooltip customizado: "Semana NN: dd mon - dd mon"
  const isoWeekNumber = (date: Date) => {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1) / 7);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = new Date(payload[0].payload.date);
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      const week = isoWeekNumber(d);
      const rangeStr = `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
      const real = payload.find((p: any) => p.dataKey === 'Casos Reais')?.value ?? null;
      const pred = payload.find((p: any) => p.dataKey === 'Previsão da IA')?.value ?? null;
      return (
        <div style={{ background: 'rgba(17,24,39,0.9)', border: '1px solid #374151', padding: 8, borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{`Semana ${week}: ${rangeStr}`}</div>
          {real !== null && <div style={{ color: '#3b82f6' }}>Casos Reais: {real}</div>}
          {pred !== null && <div style={{ color: '#f59e0b' }}>Previsão da IA: {pred}</div>}
        </div>
      );
    }
    return null;
  };
  
  const getMunicipalityName = (ibgeCode: number) => {
    const m = allMunicipalities.find(m => m.codigo_ibge === ibgeCode);
    if (!m) return "Carregando...";
    const uf = UF_BY_CODE[m.codigo_uf] || "";
    return uf ? `${uf} - ${m.nome}` : m.nome;
  };

  // Mapa de código UF -> sigla
  const UF_BY_CODE: Record<number, string> = useMemo(() => ({
    11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
    21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
    31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
    41: 'PR', 42: 'SC', 43: 'RS',
    50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'
  }), []);

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
  <AreaChart data={chartData} margin={{ top: 24, right: 20, left: -10, bottom: 5 }}>
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
          {yearMarkers.map(m => (
            <ReferenceLine
              key={`year-${m.year}`}
              x={m.date}
              stroke="#6b7280"
              strokeDasharray="4 4"
              label={{ value: String(m.year), position: 'top', fill: '#9ca3af', fontSize: 12, fontWeight: 700 }}
            />
          ))}
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            ticks={monthTicks}
            tick={<CustomMonthYearTick />}
            allowDuplicatedCategory={false}
          />
          <XAxis
            dataKey="date"
            xAxisId="year"
            orientation="top"
            stroke="#9ca3af"
            tickLine={false}
            axisLine={false}
            ticks={yearTicks}
            tick={<YearTick />}
            height={0}
            allowDuplicatedCategory={false}
          />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "14px" }} />
          <Area type="monotone" dataKey="Casos Reais" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHistoric)" strokeWidth={2} connectNulls />
          <Area type="monotone" dataKey="Previsão da IA" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPrediction)" strokeWidth={2} connectNulls />
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredMunicipalities.length > 0) {
                    e.preventDefault();
                    handleCitySelect(filteredMunicipalities[0]);
                  }
                }}
                placeholder="Pesquisar cidade..."
                className="bg-zinc-800 border border-zinc-700 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
              {showDropdown && filteredMunicipalities.length > 0 && (
                <ul className="absolute z-10 w-full bg-zinc-800 border border-zinc-700 rounded-md mt-1 max-h-48 overflow-y-auto">
                  {filteredMunicipalities.map((m) => (
                    <li
                      key={m.codigo_ibge}
                      onMouseDown={() => handleCitySelect(m)}
                      className="p-2 cursor-pointer hover:bg-zinc-700 text-sm"
                    >
                      {(UF_BY_CODE[m.codigo_uf] ? `${UF_BY_CODE[m.codigo_uf]} - ` : '') + m.nome}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="history-slider" className="text-zinc-300 text-sm whitespace-nowrap">Histórico (semanas):</label>
              <input
                id="history-slider"
                type="range"
                min="12"
                max={maxHistoryWeeks}
                value={historyWeeks}
                onChange={handleHistoryChange}
                className="w-full sm:w-40 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="w-20 h-8 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-white text-sm">
                {historyWeeks}
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
