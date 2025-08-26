"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Bot, BarChart3, Cloud, LayoutDashboard, Database, Zap, Lightbulb, TrendingUp, Compass, Stethoscope, Satellite, BrainCircuit, CheckCircle, ShieldCheck, Eye } from 'lucide-react';

// Dados fictícios para o gráfico de desempenho de treinamento
const performanceData = [
  { epoch: 1, 'Erro Treinamento': 95.8, 'Erro Validação': 98.2 },
  { epoch: 2, 'Erro Treinamento': 80.5, 'Erro Validação': 85.1 },
  { epoch: 3, 'Erro Treinamento': 65.2, 'Erro Validação': 70.0 },
  { epoch: 4, 'Erro Treinamento': 50.1, 'Erro Validação': 55.4 },
  { epoch: 5, 'Erro Treinamento': 40.3, 'Erro Validação': 45.9 },
  { epoch: 6, 'Erro Treinamento': 30.7, 'Erro Validação': 38.3 },
  { epoch: 7, 'Erro Treinamento': 25.1, 'Erro Validação': 31.0 },
  { epoch: 8, 'Erro Treinamento': 20.9, 'Erro Validação': 25.5 },
  { epoch: 9, 'Erro Treinamento': 18.2, 'Erro Validação': 21.3 },
  { epoch: 10, 'Erro Treinamento': 15.4, 'Erro Validação': 18.0 },
];

const AISummarySection = () => {
  return (
    // Fundo transparente para se adequar a qualquer estilo de página
    <section className="py-16 px-4 sm:px-8 bg-transparent text-zinc-300 font-sans">
      <div className="w-full">
        {/* Cabeçalho Principal */}
        <header className="mb-12 text-center lg:text-left px-4 md:px-8 lg:px-16">
          <div className="flex justify-center lg:justify-start items-center gap-4 mb-2">
            <Bot className="h-10 w-10 text-blue-500" />
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Motor de Previsão
            </h1>
          </div>
          <p className="text-center lg:text-left text-lg text-zinc-400 max-w-4xl mx-auto lg:mx-0">
            Nossa solução utiliza um modelo de <span className="font-bold text-white">Rede Neural Recorrente (LSTM)</span> para analisar dados históricos e prever a incidência de dengue. Aqui, detalhamos a metodologia, precisão e o impacto de nossa IA.
          </p>
        </header>

        {/* --- Grid Principal de Conteúdo --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-8 lg:px-16">
          {/* Coluna da Esquerda (Conteúdo Técnico) */}
          <div className="lg:col-span-2 flex flex-col gap-8">

            {/* Card: Arquitetura da IA e LSTM */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="h-6 w-6 text-cyan-400" />
                <h3 className="text-2xl font-bold text-white">Arquitetura da IA: LSTM</h3>
              </div>
              <p className="text-zinc-400 text-sm md:text-base mb-6 text-left">
                O coração da nossa solução é uma rede neural com arquitetura <span className="font-bold text-white">Long Short-Term Memory (LSTM)</span>. Essa arquitetura é especialista em identificar padrões e tendências em dados que ocorrem em sequência, como a evolução do número de casos ao longo do tempo. É como ter uma &apos;memória&apos; que se lembra de eventos passados para fazer previsões mais precisas no futuro.
              </p>
              
              {/* Cards de Módulos da Arquitetura */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Módulo de Entrada */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-center text-center">
                  <span className="bg-cyan-600 p-3 rounded-full mb-2">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Módulo de Entrada</h4>
                  <p className="text-xs text-zinc-400">
                    Recebe e normaliza dados históricos de casos, temperatura, precipitação e umidade.
                  </p>
                </div>
                {/* Camada LSTM */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-center text-center">
                  <span className="bg-cyan-600 p-3 rounded-full mb-2">
                    <BrainCircuit className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Camada LSTM</h4>
                  <p className="text-xs text-zinc-400">
                    Processa as sequências temporais para aprender relações complexas.
                  </p>
                </div>
                {/* Módulo de Saída */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-center text-center">
                  <span className="bg-cyan-600 p-3 rounded-full mb-2">
                    <Lightbulb className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Módulo de Saída</h4>
                  <p className="text-xs text-zinc-400">
                    Projeta o número de casos futuros com base nos padrões identificados.
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Dados do Dataset */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-emerald-400" />
                <h3 className="text-2xl font-bold text-white">Estrutura do Dataset</h3>
              </div>
              <p className="text-zinc-400 mb-6 text-sm md:text-base text-left">
                Análise e estrutura das informações utilizadas para treinar o modelo. O conjunto de dados totaliza <span className="font-bold text-white">3.3 milhões de linhas</span>, cobrindo 5.570 municípios brasileiros de 2014 a 2025. Cada linha representa uma semana epidemiológica em um município específico.
              </p>
              
              {/* Tabela de Colunas do Dataset */}
              <div className="overflow-x-auto mb-6 bg-zinc-800 rounded-lg">
                <table className="w-full text-left min-w-[700px] text-sm">
                  <thead className="text-zinc-400 uppercase tracking-wide">
                    <tr className="border-b border-zinc-700">
                      <th className="py-3 px-4">Coluna</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Exemplo</th>
                      <th className="py-3 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-700 text-zinc-300">
                      <td className="py-3 px-4 font-mono">municipio</td>
                      <td className="py-3 px-4">object</td>
                      <td className="py-3 px-4">Campinas</td>
                      <td className="py-3 px-4">Nome do município.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 bg-zinc-850 text-zinc-300">
                      <td className="py-3 px-4 font-mono">numero_casos</td>
                      <td className="py-3 px-4">int64</td>
                      <td className="py-3 px-4">350</td>
                      <td className="py-3 px-4">Contagem de casos de dengue por semana.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 text-zinc-300">
                      <td className="py-3 px-4 font-mono">semana</td>
                      <td className="py-3 px-4">int64</td>
                      <td className="py-3 px-4">15</td>
                      <td className="py-3 px-4">Semana epidemiológica (1 a 53).</td>
                    </tr>
                    <tr className="border-b border-zinc-700 bg-zinc-850 text-zinc-300">
                      <td className="py-3 px-4 font-mono">ano</td>
                      <td className="py-3 px-4">int64</td>
                      <td className="py-3 px-4">2025</td>
                      <td className="py-3 px-4">Ano do registro.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 text-zinc-300">
                      <td className="py-3 px-4 font-mono">T2M</td>
                      <td className="py-3 px-4">float64</td>
                      <td className="py-3 px-4">24.5</td>
                      <td className="py-3 px-4">Temp. Média Semanal (°C).</td>
                    </tr>
                    <tr className="border-b border-zinc-700 bg-zinc-850 text-zinc-300">
                      <td className="py-3 px-4 font-mono">PRECTOTCORR</td>
                      <td className="py-3 px-4">float64</td>
                      <td className="py-3 px-4">12.8</td>
                      <td className="py-3 px-4">Precipitação Total Semanal (mm).</td>
                    </tr>
                    <tr className="border-b border-zinc-700 text-zinc-300">
                      <td className="py-3 px-4 font-mono">RH2M</td>
                      <td className="py-3 px-4">float64</td>
                      <td className="py-3 px-4">78%</td>
                      <td className="py-3 px-4">Umidade Relativa do Ar (%).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Tags de Metadados do Dataset */}
              <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                <span className="bg-zinc-700 text-zinc-200 py-1 px-3 rounded-full">3.3M linhas</span>
                <span className="bg-zinc-700 text-zinc-200 py-1 px-3 rounded-full">2014-2025</span>
                <span className="bg-zinc-700 text-zinc-200 py-1 px-3 rounded-full">5570 municípios</span>
                <span className="bg-zinc-700 text-zinc-200 py-1 px-3 rounded-full">Sem dados ausentes</span>
              </div>
            </div>

            {/* Card: Gráfico de Treinamento - Com visual mais suave */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="h-6 w-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">Desempenho da IA no Treinamento</h3>
              </div>
              <p className="text-zinc-400 mb-4 text-sm md:text-base text-left">
                Curva de erro durante o processo de treinamento e validação, mostrando a melhoria da precisão do modelo ao longo das épocas.
              </p>
              <div className="h-80 md:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="epoch" stroke="#9ca3af" tickLine={false} axisLine={false} label={{ value: "Época", position: 'insideBottom', offset: 0, fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} label={{ value: "Erro", angle: -90, position: 'insideLeft', fill: "#9ca3af" }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: '#374151' }} itemStyle={{ color: '#d1d5db' }} />
                    <Legend wrapperStyle={{ fontSize: "14px", marginTop: "10px" }} />
                    <Line type="monotone" dataKey="Erro Treinamento" name="Erro de Treinamento" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Erro Validação" name="Erro de Validação" stroke="#eab308" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Coluna da Direita (Métricas e Utilidade) */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            {/* Card: Métricas de Avaliação */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-6 w-6 text-red-400" />
                <h3 className="text-2xl font-bold text-white text-left">Métricas de Avaliação</h3>
              </div>
              <p className="text-zinc-400 mb-6 text-sm md:text-base text-left">
                A IA é treinada para minimizar o erro. Usamos métricas de regressão para medir sua precisão.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {/* Mini Card 1: RMSE */}
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col justify-start items-start">
                  <div className="flex justify-between w-full items-center">
                    <p className="text-red-400 text-3xl font-bold">15.42</p>
                    <div className="flex items-center text-emerald-400">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      <span className="font-semibold text-sm">Excelente</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">RMSE (Erro Médio Quadrático)</p>
                  <p className="text-xs text-zinc-500 mt-1">Mede o erro médio entre a previsão e o valor real. Um valor menor indica maior precisão.</p>
                </div>
                {/* Mini Card 2: MAE */}
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col justify-start items-start">
                  <div className="flex justify-between w-full items-center">
                    <p className="text-red-400 text-3xl font-bold">8.76</p>
                    <div className="flex items-center text-emerald-400">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      <span className="font-semibold text-sm">Excelente</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">MAE (Erro Absoluto Médio)</p>
                  <p className="text-xs text-zinc-500 mt-1">Mede o desvio médio do modelo. Um valor menor indica que os erros são menores, em média.</p>
                </div>
                {/* Mini Card 3: R² */}
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col justify-start items-start">
                  <div className="flex justify-between w-full items-center">
                    <p className="text-red-400 text-3xl font-bold">91%</p>
                    <div className="flex items-center text-emerald-400">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      <span className="font-semibold text-sm">Ótimo</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">R² (Poder Preditivo)</p>
                  <p className="text-xs text-zinc-500 mt-1">Indica o quão bem o modelo explica a variação nos dados. Um valor próximo de 100% é ideal.</p>
                </div>
              </div>
            </div>
            
            {/* Card: Fontes de Dados Fundamentais - Movido para a direita */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-pink-400" />
                <h3 className="text-2xl font-bold text-white text-left">Fontes de Dados Fundamentais</h3>
              </div>
              <p className="text-zinc-400 mb-6 text-sm md:text-base text-left">
                A precisão do nosso modelo é construída sobre a confiabilidade de nossas fontes.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                  <span className="flex-shrink-0 bg-blue-500 p-2 rounded-md">
                    <Stethoscope className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <h4 className="font-semibold text-white text-left">SUS</h4>
                    <p className="text-xs text-zinc-400 text-left">Dados de casos de dengue confirmados e notificados.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                  <span className="flex-shrink-0 bg-red-500 p-2 rounded-md">
                    <Satellite className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <h4 className="font-semibold text-white text-left">NASA POWER</h4>
                    <p className="text-xs text-zinc-400 text-left">Informações climáticas de alta resolução, como temperatura e umidade.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card: Utilidade e Importância */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="h-6 w-6 text-amber-400" />
                <h3 className="text-2xl font-bold text-white text-left">Utilidade na Saúde Pública</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 text-zinc-400">
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex items-start gap-3">
                  <Compass className="h-6 w-6 text-amber-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-base text-amber-300 mb-1 text-left">Tomada de Decisão</h4>
                    <p className="text-sm text-left">
                      As previsões permitem que órgãos de saúde aloquem recursos (<span className="font-bold text-white">equipes, leitos</span>) de forma proativa.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6 text-amber-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-base text-amber-300 mb-1 text-left">Campanhas de Prevenção</h4>
                    <p className="text-sm text-left">
                      Com a capacidade de identificar áreas de risco, é possível direcionar campanhas e controle de vetores para os locais certos.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex items-start gap-3">
                  <Eye className="h-6 w-6 text-amber-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-base text-amber-300 mb-1 text-left">Transparência e Conscientização</h4>
                    <p className="text-sm text-left">
                      Apresentar os dados e a metodologia de forma clara aumenta a confiança na ferramenta e empodera a população.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISummarySection;
