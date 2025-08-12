import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, MapPin, Thermometer, CloudRain, AlertTriangle, SprayCan, Users, Lightbulb } from 'lucide-react';

// Dados fictícios para demonstração
const mockApiData = {
  'Campinas': {
    historicData: [
      { week: 'Sem. 1', cases: 150 }, { week: 'Sem. 2', cases: 160 }, { week: 'Sem. 3', cases: 180 },
      { week: 'Sem. 4', cases: 200 }, { week: 'Sem. 5', cases: 220 }, { week: 'Sem. 6', cases: 210 },
      { week: 'Sem. 7', cases: 190 }, { week: 'Sem. 8', cases: 170 }, { week: 'Sem. 9', cases: 165 },
      { week: 'Sem. 10', cases: 180 }, { week: 'Sem. 11', cases: 210 }, { week: 'Sem. 12', cases: 250 },
    ],
    prediction: [
      { week: 'Sem. 13', cases: 280 }, { week: 'Sem. 14', cases: 310 }, { week: 'Sem. 15', cases: 300 },
      { week: 'Sem. 16', cases: 270 },
    ],
    insights: [
      {
        icon: Thermometer,
        title: 'Temperatura',
        description: 'Aumento de 1°C na temperatura média está correlacionado com um crescimento de casos após 2 semanas.',
        value: '+3%',
        timeframe: '2 semanas',
      },
      {
        icon: CloudRain,
        title: 'Precipitação',
        description: 'Volume de precipitação superior a 50mm em uma semana apresenta correlação com um pico de casos.',
        value: '> 50mm',
        timeframe: '4 semanas',
      },
      {
        icon: MapPin,
        title: 'Influência Geográfica',
        description: 'A IA identificou um padrão sazonal mais agressivo, possivelmente influenciado pela proximidade do município à bacia do Rio Tietê.',
        value: 'Localização',
        timeframe: 'Sazonal',
      },
    ],
    actionPlan: [
      {
        icon: AlertTriangle,
        title: 'Monitoramento',
        description: 'A previsão para as próximas 4 semanas indica um aumento de 15% nos casos. Mobilizar 100 agentes de campo para intensificar a fiscalização e a nebulização nos bairros de alto risco.',
      },
      {
        icon: SprayCan,
        title: 'Controle Vetorial',
        description: 'Implementar nebulização preventiva em áreas críticas e reforçar o controle de focos em espaços públicos e residenciais.',
      },
      {
        icon: Users,
        title: 'Conscientização',
        description: 'Lançar campanhas de educação comunitária sobre a eliminação de criadouros, com foco em mídias sociais e TV local.',
      }
    ],
  },
  'São Paulo': {
    historicData: [
      { week: 'Sem. 1', cases: 800 }, { week: 'Sem. 2', cases: 950 }, { week: 'Sem. 3', cases: 1100 },
      { week: 'Sem. 4', cases: 1000 }, { week: 'Sem. 5', cases: 700 }, { week: 'Sem. 6', cases: 600 },
      { week: 'Sem. 7', cases: 550 }, { week: 'Sem. 8', cases: 680 }, { week: 'Sem. 9', cases: 850 },
      { week: 'Sem. 10', cases: 1050 }, { week: 'Sem. 11', cases: 1200 }, { week: 'Sem. 12', cases: 980 },
    ],
    prediction: [
      { week: 'Sem. 13', cases: 1020 }, { week: 'Sem. 14', cases: 1150 }, { week: 'Sem. 15', cases: 1300 },
      { week: 'Sem. 16', cases: 1250 },
    ],
    insights: [
      {
        icon: Thermometer,
        title: 'Temperatura',
        description: 'Temperaturas acima de 28°C por 7 dias seguidos aumentam a taxa de replicação viral e a densidade de vetores.',
        value: '> 28°C',
        timeframe: '3 semanas',
      },
      {
        icon: CloudRain,
        title: 'Precipitação',
        description: 'Períodos de seca seguidos por chuvas intermitentes podem gerar micro-criadouros.',
        value: 'Focos',
        timeframe: '2-3 semanas',
      },
      {
        icon: MapPin,
        title: 'Influência Geográfica',
        description: 'A densidade populacional e a infraestrutura urbana complexa são os principais fatores que intensificam a propagação do vírus.',
        value: 'Densidade',
        timeframe: 'Urbano',
      },
    ],
    actionPlan: [
      {
        icon: AlertTriangle,
        title: 'Risco Elevado',
        description: 'A previsão aponta para um pico de casos em 3 semanas. Iniciar imediatamente campanhas de conscientização massiva e monitoramento intensivo em áreas de alta densidade populacional.',
      },
      {
        icon: SprayCan,
        title: 'Controle Vetorial',
        description: 'Mobilizar 500 agentes para vistorias em imóveis e realizar fumacê direcionado em bairros críticos.',
      },
      {
        icon: Users,
        title: 'Conscientização',
        description: 'Lançar campanhas educativas em estações de metrô e terminais de ônibus, além de mídias digitais.',
      }
    ],
  },
  'Rio de Janeiro': {
    historicData: [
      { week: 'Sem. 1', cases: 500 }, { week: 'Sem. 2', cases: 620 }, { week: 'Sem. 3', cases: 750 },
      { week: 'Sem. 4', cases: 680 }, { week: 'Sem. 5', cases: 450 }, { week: 'Sem. 6', cases: 300 },
      { week: 'Sem. 7', cases: 280 }, { week: 'Sem. 8', cases: 350 }, { week: 'Sem. 9', cases: 480 },
      { week: 'Sem. 10', cases: 600 }, { week: 'Sem. 11', cases: 720 }, { week: 'Sem. 12', cases: 590 },
    ],
    prediction: [
      { week: 'Sem. 13', cases: 650 }, { week: 'Sem. 14', cases: 700 }, { week: 'Sem. 15', cases: 780 },
      { week: 'Sem. 16', cases: 850 },
    ],
    insights: [
      {
        icon: Thermometer,
        title: 'Temperatura',
        description: 'A temperatura constante e alta na região aumenta a incidência de casos, correlacionando o aumento da temperatura com o aumento da viremia.',
        value: 'Direta',
        timeframe: 'Constante',
      },
      {
        icon: CloudRain,
        title: 'Precipitação',
        description: 'Aumento súbito de chuvas de verão, seguido por altas temperaturas, impacta diretamente a proliferação do mosquito.',
        value: 'Aumento',
        timeframe: 'Exponencial',
      },
      {
        icon: MapPin,
        title: 'Influência Geográfica',
        description: 'A geografia da cidade, com morros e urbanização densa, foi identificada como um fator chave que acelera a propagação.',
        value: 'Urbanização',
        timeframe: 'Crítico',
      },
    ],
    actionPlan: [
      {
        icon: AlertTriangle,
        title: 'Risco de Ponto de Inflexão',
        description: 'A curva de casos está em ascensão. É crítico iniciar um plano de contingência para as próximas 4 semanas.',
      },
      {
        icon: SprayCan,
        title: 'Controle Vetorial',
        description: 'Focar em controle vetorial e educação comunitária em áreas de favelas e zonas de fronteira. Ações de fumacê em 50 bairros de risco.',
      },
      {
        icon: Users,
        title: 'Conscientização',
        description: 'Realizar mutirões de limpeza e inspeção em 100 comunidades, com o apoio de associações de moradores.',
      }
    ],
  },
};

const municipalities = Object.keys(mockApiData);

// Shadcn/ui-like components for demonstration
const ShadcnCard = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg ${className}`}>
    {children}
  </div>
);
const ShadcnCardHeader = ({ children, className = '' }) => (
  <div className={`flex flex-col space-y-1.5 ${className}`}>
    {children}
  </div>
);
const ShadcnCardTitle = ({ children, className = '' }) => (
  <h3 className={`text-2xl font-semibold text-white leading-none tracking-tight ${className}`}>
    {children}
  </h3>
);
const ShadcnCardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-zinc-400 ${className}`}>
    {children}
  </p>
);
const ShadcnCardContent = ({ children, className = '' }) => (
  <div className={`p-0 pt-6 ${className}`}>
    {children}
  </div>
);
const ShadcnSelect = ({ children, value, onValueChange }) => (
  <select value={value} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white ring-offset-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
    {children}
  </select>
);
const ShadcnSelectItem = ({ value, children }) => (
  <option value={value}>{children}</option>
);
const ShadcnInput = ({ ...props }) => (
  <input className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...props} />
);
const ShadcnButton = ({ children, className, ...props }) => (
  <button className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 ${className}`} {...props}>
    {children}
  </button>
);


// Main App component
const App = () => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Campinas');
  const [weeksToPredict, setWeeksToPredict] = useState(4);
  const [data, setData] = useState(mockApiData[selectedMunicipality as keyof typeof mockApiData]);
  const [loading, setLoading] = useState(true);

  // Simula o carregamento dos dados da API
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setData(mockApiData[selectedMunicipality as keyof typeof mockApiData]);
      setLoading(false);
    }, 500); // Atraso para simular uma chamada de API

    return () => clearTimeout(timer);
  }, [selectedMunicipality]);

  const allData = data.historicData.concat(data.prediction.slice(0, weeksToPredict));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-white text-center tracking-tight lg:text-5xl">
          Painel de Análise Preditiva de Casos de Dengue
        </h1>
        <p className="text-center mt-2 text-lg text-zinc-500">
          Utilizando Inteligência Artificial para Previsão e Estratégia
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">

        {/* Card do Gráfico */}
        <div className="lg:col-span-2">
          <ShadcnCard className="h-full flex flex-col">
            <ShadcnCardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <BarChart className="h-8 w-8 text-orange-400 mb-2" />
                  <ShadcnCardTitle>Previsão de Casos de Dengue</ShadcnCardTitle>
                  <ShadcnCardDescription>
                    Visualização de dados históricos e previsão gerada pela IA.
                  </ShadcnCardDescription>
                </div>
                <div className="flex flex-col gap-2">
                  <ShadcnSelect value={selectedMunicipality} onValueChange={(val) => setSelectedMunicipality(val)}>
                    {municipalities.map(m => (
                      <ShadcnSelectItem key={m} value={m}>{m}</ShadcnSelectItem>
                    ))}
                  </ShadcnSelect>
                  <div className="flex items-center gap-2">
                    <label htmlFor="weeks" className="text-zinc-400 text-sm">Semanas:</label>
                    <ShadcnInput
                      id="weeks"
                      type="number"
                      value={weeksToPredict}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = parseInt(e.target.value, 10);
                        setWeeksToPredict(isNaN(value) ? 0 : value);
                      }}
                      min="0"
                      max="12"
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </ShadcnCardHeader>
            <ShadcnCardContent className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-zinc-700"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={allData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorHistoric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ffc658" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" stroke="#8884d8" />
                    <YAxis stroke="#8884d8" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const isPrediction = data.week.includes('1');
                          return (
                            <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-700 text-white">
                              <p className="font-bold">{data.week}</p>
                              <p>Casos: {data.cases}</p>
                              {isPrediction && <p className="text-yellow-400">Previsão</p>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="cases" stroke="#8884d8" fillOpacity={1} fill="url(#colorHistoric)" />
                    {data.prediction.slice(0, weeksToPredict).length > 0 && (
                      <Area
                        type="monotone"
                        dataKey="cases"
                        stroke="#ffc658"
                        fillOpacity={0.5}
                        fill="url(#colorPrediction)"
                        data={allData.slice(data.historicData.length -1)}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ShadcnCardContent>
          </ShadcnCard>
        </div>
        
        {/* Card de Análise de Fatores Críticos */}
        <ShadcnCard className="col-span-1">
          <ShadcnCardHeader>
            <MapPin className="h-8 w-8 text-emerald-400 mb-2" />
            <ShadcnCardTitle>Análise de Fatores Críticos</ShadcnCardTitle>
            <ShadcnCardDescription>
              Correlações identificadas pelo modelo entre fatores ambientais e a incidência de casos.
            </ShadcnCardDescription>
          </ShadcnCardHeader>
          <ShadcnCardContent>
            <div className="space-y-4">
              {data.insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div key={index} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-6 w-6 text-emerald-400" />
                      <div>
                        <h5 className="font-semibold text-zinc-200">{insight.title}</h5>
                        <p className="text-xs text-zinc-500">{insight.timeframe}</p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                      <span className="font-bold text-lg text-emerald-300">{insight.value}</span>
                      {' - ' + insight.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </ShadcnCardContent>
        </ShadcnCard>
        
        {/* Card de Plano de Ação Estratégico */}
        <ShadcnCard className="col-span-1 xl:col-span-1">
          <ShadcnCardHeader>
            <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
            <ShadcnCardTitle>Plano de Ação Estratégico</ShadcnCardTitle>
            <ShadcnCardDescription>
              Recomendações personalizadas com base na previsão da IA.
            </ShadcnCardDescription>
          </ShadcnCardHeader>
          <ShadcnCardContent>
            <div className="space-y-4">
              {data.actionPlan.map((action, index) => {
                const Icon = action.icon;
                return (
                  <div key={index} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <h5 className="font-semibold text-lg text-red-400 flex items-center gap-2 mb-1">
                      <Icon size={20} />
                      {action.title}
                    </h5>
                    <p className="text-sm text-zinc-300">{action.description}</p>
                  </div>
                );
              })}
            </div>
          </ShadcnCardContent>
        </ShadcnCard>
      </main>
    </div>
  );
};

export default App;
