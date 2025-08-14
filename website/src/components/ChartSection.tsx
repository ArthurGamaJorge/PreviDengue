import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MapPin, Thermometer, CloudRain, Droplets, AlertTriangle, Lightbulb, BrainCircuit, BarChart3, CalendarClock, Bot } from 'lucide-react';

// --- Dados de Configuração ---
// Em uma aplicação real, isso viria de um endpoint da API ou de um arquivo de configuração.
const MUNICIPALITIES = [
  { name: 'Campinas', ibge_code: 3509502 },
  { name: 'São Paulo', ibge_code: 3550308 },
  { name: 'Sumaré', ibge_code: 3552403 },
  { name: 'Rio de Janeiro', ibge_code: 3304557 },
  { name: 'Belo Horizonte', ibge_code: 3106200 },
];

// --- Componentes de UI (Estilo Shadcn/ui) ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg transition-all duration-300 hover:border-blue-500/50 ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ children }) => <div className="p-6">{children}</div>;
const CardTitle = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-3">
    {Icon && <Icon className="h-7 w-7 text-blue-400" />}
    <h3 className="text-xl font-bold text-white tracking-tight">{children}</h3>
  </div>
);
const CardDescription = ({ children }) => <p className="text-sm text-zinc-400 mt-1.5">{children}</p>;
const CardContent = ({ children, className = '' }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

// --- Componente Principal do Dashboard ---
const App = () => {
  const [selectedIbgeCode, setSelectedIbgeCode] = useState<string>(
    MUNICIPALITIES[0].ibge_code.toString()
  );
  const [weeksToPredict, setWeeksToPredict] = useState(8);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('http://127.0.0.1:8000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ibge_code: parseInt(selectedIbgeCode, 10),
            weeks_to_predict: parseInt(weeksToPredict.toString(), 10) || 4,
          }),
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setApiData(data);
      } catch (e) {
        console.error("Falha ao buscar dados da API:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedIbgeCode, weeksToPredict]);

  const chartData = useMemo(() => {
    if (!apiData) return [];
    
    const formattedHistoric = apiData.historic_data.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      casos_reais: d.cases,
      casos_previstos: null,
    }));

    const formattedPrediction = apiData.predicted_data.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      casos_reais: null,
      casos_previstos: d.predicted_cases
    }));

    // Conecta a última data histórica com a primeira previsão para uma linha contínua
    if (formattedHistoric.length > 0 && formattedPrediction.length > 0) {
        const lastHistoricPoint = formattedHistoric[formattedHistoric.length - 1];
        formattedPrediction.unshift({
            ...formattedPrediction[0],
            date: lastHistoricPoint.date, // Usa a mesma data para o ponto de conexão
            casos_previstos: lastHistoricPoint.casos_reais
        });
    }

    return [...formattedHistoric, ...formattedPrediction];
  }, [apiData]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-zinc-400">
          <Bot className="h-16 w-16 animate-pulse text-blue-500" />
          <p className="mt-4 text-lg">Analisando dados e gerando previsões...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-red-400 bg-red-900/20 rounded-lg">
          <AlertTriangle className="h-16 w-16" />
          <p className="mt-4 text-lg font-semibold">Erro ao carregar análise</p>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      );
    }
    if (!apiData) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
          <p>Selecione um município para iniciar a análise.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Gráfico e Sumário */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle icon={BarChart3}>Previsão de Casos de Dengue para {apiData.municipality_name}</CardTitle>
              <CardDescription>Dados históricos (último ano) e previsão gerada pela IA para as próximas semanas.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorHistoric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
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
                  <Legend wrapperStyle={{fontSize: "14px"}}/>
                  <Area type="monotone" dataKey="casos_reais" name="Casos Reais" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHistoric)" strokeWidth={2} />
                  <Area type="monotone" dataKey="casos_previstos" name="Previsão da IA" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPrediction)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle icon={Lightbulb}>Sumário Estratégico da IA</CardTitle>
                <CardDescription>A conclusão principal do modelo para planejamento de ações.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-zinc-300 text-base leading-relaxed">{apiData.insights.strategic_summary}</p>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Insights e Gatilhos */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle icon={BrainCircuit}>Análise de Gatilhos (Lag)</CardTitle>
              <CardDescription>Correlação entre fatores climáticos e os casos de dengue ao longo do tempo.</CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src={`data:image/png;base64,${apiData.insights.lag_analysis_plot_base64}`}
                alt="Gráfico de Análise de Defasagem"
                className="w-full h-auto rounded-md bg-zinc-800"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle icon={CalendarClock}>Pontos de Inflexão</CardTitle>
              <CardDescription>Fatores chave e seus tempos de impacto máximo.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {apiData.insights.tipping_points.map((point, index) => {
                  const Icon = point.factor === 'Temperatura' ? Thermometer : point.factor === 'Precipitação' ? CloudRain : Droplets;
                  return (
                    <li key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 bg-zinc-800 p-2 rounded-full mt-1">
                        <Icon className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-200">{point.factor}</p>
                        <p className="text-sm text-zinc-400">{point.value}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center tracking-tight">
            Painel Preditivo de Dengue
          </h1>
          <p className="text-center mt-2 text-lg text-zinc-400">
            Inteligência Artificial para Antecipação de Riscos e Planejamento Estratégico
          </p>
        </header>

        <Card className="mb-8">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-1/2 flex items-center gap-3">
              <label htmlFor="municipality" className="text-zinc-300 font-medium whitespace-nowrap">
                <MapPin className="inline h-5 w-5 mr-1" />
                Município:
              </label>
              <select
                id="municipality"
                value={selectedIbgeCode}
                onChange={(e) => setSelectedIbgeCode(e.target.value)}
                className="flex-grow h-10 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MUNICIPALITIES.map(m => (
                  <option key={m.ibge_code} value={m.ibge_code}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-1/2 flex items-center gap-3">
              <label htmlFor="weeks" className="text-zinc-300 font-medium whitespace-nowrap">
                <CalendarClock className="inline h-5 w-5 mr-1" />
                Prever Semanas:
              </label>
              <input
                id="weeks"
                type="range"
                min="4"
                max="16"
                step="4"
                value={weeksToPredict}
                onChange={(e) => setWeeksToPredict(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="font-bold text-white bg-zinc-800 px-3 py-1 rounded-md">{weeksToPredict}</span>
            </div>
          </div>
        </Card>

        {renderContent()}

      </div>
    </div>
  );
};

export default App;
