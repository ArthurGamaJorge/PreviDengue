// @/components/App.tsx
import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MapPin, Thermometer, CloudRain, Droplets, AlertTriangle, Lightbulb, BrainCircuit, BarChart3, CalendarClock, Bot, Bell, ActivitySquare, CheckCircle, Car, Download } from 'lucide-react';
import { API_URL } from "@/lib/config";

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

type RiskLevel = 'Alto' | 'Médio' | 'Baixo';

interface MockAddress {
  street: string;
  neighborhood: string;
  coords: string;
  risk_level: RiskLevel;
  main_risk_factor: string;
}

const mockAddresses: MockAddress[] = [
  { street: "Rua das Laranjeiras, 123", neighborhood: "Centro", coords: "-22.9056, -47.0608", risk_level: 'Alto', main_risk_factor: 'Histórico de Casos' },
  { street: "Avenida João Pessoa, 456", neighborhood: "Vila Mariana", coords: "-22.9112, -47.0543", risk_level: 'Médio', main_risk_factor: 'Previsão de Temperatura Elevada' },
  { street: "Travessa da Paz, 789", neighborhood: "Jardim Planalto", coords: "-22.9234, -47.0671", risk_level: 'Alto', main_risk_factor: 'Proximidade a Áreas de Acúmulo de Água' },
  { street: "Rua dos Pinheiros, 101", neighborhood: "Parque Industrial", coords: "-22.9089, -47.0722", risk_level: 'Baixo', main_risk_factor: 'Risco Geral Reduzido' },
  { street: "Rua do Sol, 202", neighborhood: "Distrito Verde", coords: "-22.9150, -47.0700", risk_level: 'Médio', main_risk_factor: 'Padrões de Vento e Umidade' },
  { street: "Rua dos Eucaliptos, 333", neighborhood: "São João", coords: "-22.9001, -47.0505", risk_level: 'Alto', main_risk_factor: 'Histórico de Casos' },
  { street: "Avenida Brasil, 777", neighborhood: "Bosque", coords: "-22.9080, -47.0590", risk_level: 'Alto', main_risk_factor: 'Previsão de Chuva Forte' },
  { street: "Rua das Flores, 45", neighborhood: "Nova Campinas", coords: "-22.8988, -47.0655", risk_level: 'Baixo', main_risk_factor: 'Risco Geral Reduzido' },
];


// --- Componentes de UI (Estilo Shadcn/ui) com Tipagem ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg transition-all duration-300 hover:border-blue-500/50 ${className}`}>
    {children}
  </div>
);

interface CardHeaderProps {
  children: React.ReactNode;
}
const CardHeader = ({ children }: CardHeaderProps) => <div className="p-6">{children}</div>;

interface CardTitleProps {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}
const CardTitle = ({ children, icon: Icon }: CardTitleProps) => (
  <div className="flex items-center gap-3">
    {Icon && <Icon className="h-7 w-7 text-blue-400" />}
    <h3 className="text-xl font-bold text-white tracking-tight">{children}</h3>
  </div>
);

interface CardDescriptionProps {
  children: React.ReactNode;
}
const CardDescription = ({ children }: CardDescriptionProps) => <p className="text-sm text-zinc-400 mt-1.5">{children}</p>;

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}
const CardContent = ({ children, className = '' }: CardContentProps) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

// -------------------------------------------------------------------------------------------------

// --- Novo tipo unificado para os dados do gráfico ---
interface ChartPoint {
  date: string;
  'Casos Reais': number | null;
  'Previsão da IA': number | null;
}

// --- Componente Principal do Dashboard ---
const App = () => {
  const [selectedIbgeCode, setSelectedIbgeCode] = useState<number>(MUNICIPALITIES[0].ibge_code);
  const [weeksToPredict, setWeeksToPredict] = useState<number>(8);
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'Todos'>('Todos');

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

  // Memoização dos dados do gráfico para evitar renderizações desnecessárias
  const chartData = useMemo(() => {
    if (!apiData?.historic_data || !apiData?.predicted_data) return [];

    // Formata os dados históricos
    const formattedHistoric: ChartPoint[] = apiData.historic_data.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      'Casos Reais': d.cases,
      'Previsão da IA': null,
    }));

    // Formata os dados de previsão
    const formattedPrediction: ChartPoint[] = apiData.predicted_data.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      'Casos Reais': null,
      'Previsão da IA': d.predicted_cases
    }));

    let finalChartData = [...formattedHistoric];

    // Cria um ponto de conexão entre os dados reais e a previsão
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

  // Funções de manipulação para os controles de entrada
  const handleMunicipalityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIbgeCode(Number(e.target.value));
  };

  const handleWeeksChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWeeksToPredict(Number(e.target.value));
  };

  const handleWeeksInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 100) {
      setWeeksToPredict(value);
    } else if (e.target.value === '') {
      setWeeksToPredict(1);
    }
  };

  // Funções utilitárias para classes e ícones
  const getSeverityClasses = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return <CheckCircle className="h-5 w-5" />;
      case 'medium':
        return <ActivitySquare className="h-5 w-5" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch(risk) {
        case 'Alto': return 'text-rose-500 font-bold';
        case 'Médio': return 'text-amber-500 font-medium';
        case 'Baixo': return 'text-emerald-500';
    }
  };

  // Função para gerar o relatório de texto e forçar o download
  const handleDownloadReport = () => {
    let content = `
RELATÓRIO DE FISCALIZAÇÃO - PONTOS DE ATENÇÃO

Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}
Município: ${apiData?.municipality_name || 'Desconhecido'}

---
    
Este documento contém uma lista de locais priorizados pela inteligência artificial para inspeção de campo. A priorização é baseada na análise de fatores climáticos e no histórico de casos.

---

LOCAIS SUGERIDOS PARA INSPEÇÃO:

`;

    mockAddresses.forEach((address, index) => {
      content += `
${index + 1}. Endereço: ${address.street}, ${address.neighborhood}
   Nível de Risco: ${address.risk_level}
   Fator Principal: ${address.main_risk_factor}
   Coordenadas: ${address.coords}
`;
    });

    content += `
---

Este relatório é uma ferramenta de apoio. Use seu julgamento profissional e informações de campo para a tomada de decisões.
    `;

    // Cria um Blob do conteúdo e força o download como um arquivo de texto
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_fiscalizacao_${selectedIbgeCode}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtra a lista de endereços com base no estado `filterRisk`
  const filteredAddresses = useMemo(() => {
    if (filterRisk === 'Todos') {
      return mockAddresses;
    }
    return mockAddresses.filter(addr => addr.risk_level === filterRisk);
  }, [filterRisk]);


  // Renderiza o conteúdo principal do dashboard
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
        <div className="flex flex-col items-center justify-center h-96 text-red-400 bg-red-900/20 rounded-lg p-6">
          <AlertTriangle className="h-16 w-16" />
          <p className="mt-4 text-lg font-semibold">Erro ao carregar análise</p>
          <p className="text-sm text-red-300 text-center">{error}</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel da Esquerda: Gatilhos e Impacto */}
        <div className="flex flex-col gap-6 order-1 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle icon={BrainCircuit}>Gatilhos e Impacto</CardTitle>
              <CardDescription>Veja a relação entre eventos climáticos e o surgimento dos casos de dengue no tempo.</CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src={`data:image/png;base64,${apiData.insights.lag_analysis_plot_base64}`}
                alt="Gráfico de Análise de Gatilhos e Impacto"
                className="w-full h-auto rounded-md bg-zinc-800"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle icon={CalendarClock}>Pontos de Atenção</CardTitle>
              <CardDescription>Saiba quais fatores, como chuva e temperatura, têm o maior impacto e quando agir.</CardDescription>
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

        {/* Coluna Central: Gráfico de Previsão (bem mais largo) */}
        <div className="lg:col-span-2 flex flex-col gap-6 order-2 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle icon={BarChart3}>Previsão de Casos de Dengue</CardTitle>
              <CardDescription>Dados históricos e previsão da IA para {apiData.municipality_name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
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

        {/* Painel da Direita: Alertas e Notificações */}
        <div className="flex flex-col gap-6 order-3 lg:order-3">
          <Card>
            <CardHeader>
              <CardTitle icon={Bell}>Alertas para Ação</CardTitle>
              <CardDescription>Sinais importantes para guiar suas ações de campo nas próximas semanas.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-4">
                {apiData.alerts.map((alert, index) => (
                  <li key={index} className={`flex items-start gap-4 p-4 rounded-lg border ${getSeverityClasses(alert.severity)}`}>
                    <div className="flex-shrink-0 mt-1">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-200">{alert.title}</p>
                      <p className="text-sm text-zinc-400">{alert.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle icon={Car}>Pontos para Inspeção Prioritária</CardTitle>
              <CardDescription>Locais com maior probabilidade de foco, baseada na análise da IA. Clique para filtrar por nível de risco.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setFilterRisk('Todos')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterRisk === 'Todos' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>Todos</button>
                    <button onClick={() => setFilterRisk('Alto')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterRisk === 'Alto' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>Alto Risco</button>
                    <button onClick={() => setFilterRisk('Médio')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterRisk === 'Médio' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>Médio Risco</button>
                    <button onClick={() => setFilterRisk('Baixo')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterRisk === 'Baixo' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>Baixo Risco</button>
                </div>
              <ul className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {filteredAddresses.map((address, index) => (
                  <li key={index} className="border border-zinc-800 p-4 rounded-lg flex flex-col gap-1">
                    <p className="font-semibold text-zinc-200">{address.street}, {address.neighborhood}</p>
                    <p className="text-sm text-zinc-400">Risco: <span className={`${getRiskColor(address.risk_level)}`}>{address.risk_level}</span></p>
                    <p className="text-sm text-zinc-400">Fator Principal: {address.main_risk_factor}</p>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleDownloadReport}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md transition-colors hover:bg-blue-700"
              >
                <Download className="h-5 w-5" />
                Gerar Relatório de Fiscalização
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-zinc-300 font-sans px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">   
       <div>
        <Card className="mb-8 p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="w-full sm:w-1/2 flex items-center gap-3">
              <label htmlFor="municipality" className="text-zinc-300 font-medium whitespace-nowrap">
                <MapPin className="inline h-5 w-5 mr-1 text-blue-400" />
                Município:
              </label>
              <select
                id="municipality"
                value={selectedIbgeCode}
                onChange={handleMunicipalityChange}
                className="flex-grow h-10 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MUNICIPALITIES.map(m => (
                  <option key={m.ibge_code} value={m.ibge_code}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-1/2 flex items-center gap-3">
              <label htmlFor="weeks-slider" className="text-zinc-300 font-medium whitespace-nowrap">
                <CalendarClock className="inline h-5 w-5 mr-1 text-amber-400" />
                Prever Semanas:
              </label>
              <input
                id="weeks-slider"
                type="range"
                min="1"
                max="100"
                value={weeksToPredict}
                onChange={handleWeeksChange}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="number"
                value={weeksToPredict}
                onChange={handleWeeksInputChange}
                className="w-16 h-10 rounded-md border border-zinc-700 bg-zinc-800 text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="100"
              />
            </div>
          </div>
        </Card>

        {renderContent()}

      </div>
    </div>
  );
};

export default App;
