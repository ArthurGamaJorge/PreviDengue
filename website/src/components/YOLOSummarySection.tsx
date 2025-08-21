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
import { Target, Eye, BarChart3, Cloud, LayoutDashboard, Database, Zap, Lightbulb, TrendingUp, Compass, Stethoscope, Satellite, BrainCircuit, CheckCircle, ShieldCheck, SquareTerminal, Car, Box, Video, Code, Image, Grid3X3, Layers } from 'lucide-react';

// Dados fictícios para o gráfico de desempenho de treinamento
const performanceData = [
  { epoch: 1, 'Erro Treinamento': 0.9, 'Erro Validação': 0.95 },
  { epoch: 2, 'Erro Treinamento': 0.7, 'Erro Validação': 0.8 },
  { epoch: 3, 'Erro Treinamento': 0.5, 'Erro Validação': 0.6 },
  { epoch: 4, 'Erro Treinamento': 0.35, 'Erro Validação': 0.45 },
  { epoch: 5, 'Erro Treinamento': 0.2, 'Erro Validação': 0.3 },
  { epoch: 6, 'Erro Treinamento': 0.15, 'Erro Validação': 0.25 },
  { epoch: 7, 'Erro Treinamento': 0.1, 'Erro Validação': 0.18 },
  { epoch: 8, 'Erro Treinamento': 0.08, 'Erro Validação': 0.12 },
  { epoch: 9, 'Erro Treinamento': 0.05, 'Erro Validação': 0.09 },
  { epoch: 10, 'Erro Treinamento': 0.04, 'Erro Validação': 0.07 },
];

const YoloDetectionSection = () => {
  return (
    // Fundo transparente para se adequar a qualquer estilo de página
    <section className="py-16 px-4 sm:px-8 bg-transparent text-zinc-300 font-sans">
      <div className="w-full">
        {/* Cabeçalho Principal */}
        <header className="mb-12 text-center lg:text-left px-4 md:px-8 lg:px-16">
          <div className="flex justify-center lg:justify-start items-center gap-4 mb-2">
            <Target className="h-10 w-10 text-rose-500" />
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Visão Geral da IA: YOLO
            </h1>
          </div>
          <p className="text-center lg:text-left text-lg text-zinc-400 max-w-4xl mx-auto lg:mx-0">
            A tecnologia <span className="font-bold text-white">YOLO (You Only Look Once)</span> revoluciona a detecção de objetos ao processar imagens e vídeos em tempo real. Entenda como ela identifica, localiza e classifica objetos com precisão e velocidade.
          </p>
        </header>

        {/* --- Grid Principal de Conteúdo --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-8 lg:px-16">
          {/* Coluna da Esquerda (Conteúdo Técnico) */}
          <div className="lg:col-span-2 flex flex-col gap-8">

            {/* Card: O Conceito "You Only Look Once" */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-6 w-6 text-rose-400" />
                <h3 className="text-2xl font-bold text-white">O Conceito: Você Só Olha Uma Vez</h3>
              </div>
              <p className="text-zinc-400 text-sm md:text-base mb-6 text-left">
                Diferente de métodos tradicionais que analisam a imagem em várias etapas para encontrar e classificar objetos, o YOLO inova ao fazer a detecção em uma única passagem. O modelo divide a imagem em uma grade e, para cada célula, prevê simultaneamente a existência de objetos, suas localizações (caixas delimitadoras) e as classes a que pertencem. Isso permite um processamento extremamente rápido, ideal para aplicações em tempo real.
              </p>
              
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="relative w-full rounded-lg overflow-hidden shadow-md">
                  <img
                    src="https://picsum.photos/1000"
                    alt="Exemplo de imagem com caixas de detecção de objetos"
                    className="w-full h-120"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center text-white p-4">
                    <p className="text-sm text-center md:text-base">
                      {/*  */}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Esta imagem ilustra o resultado da detecção em uma única passagem, com as caixas delimitadoras e as classes de objetos aplicadas diretamente.
                </p>
              </div>

              {/* Cards de Pontos Chave */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Módulo de Entrada */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-start text-left">
                  <span className="bg-rose-600 p-3 rounded-full mb-2">
                    <Zap className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Velocidade Extrema</h4>
                  <p className="text-xs text-zinc-400">
                    Capaz de processar dezenas de frames por segundo, tornando-se perfeito para vídeos e robótica.
                  </p>
                </div>
                {/* Camada LSTM */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-start text-left">
                  <span className="bg-rose-600 p-3 rounded-full mb-2">
                    <Grid3X3 className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Visão Holística</h4>
                  <p className="text-xs text-zinc-400">
                    O modelo 'vê' a imagem inteira de uma só vez, o que reduz erros de contexto.
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Arquitetura da Rede Neural */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="h-6 w-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">Arquitetura do Modelo</h3>
              </div>
              <p className="text-zinc-400 mb-6 text-sm md:text-base text-left">
                A estrutura do YOLO é dividida em três partes principais que trabalham em conjunto para uma detecção eficiente.
              </p>
              
              {/* Cards de Módulos da Arquitetura */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Backbone */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-center text-center">
                  <span className="bg-purple-600 p-3 rounded-full mb-2">
                    <Layers className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Backbone</h4>
                  <p className="text-xs text-zinc-400">
                    Extrai as características essenciais da imagem.
                  </p>
                </div>
                {/* Neck */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-center text-center">
                  <span className="bg-purple-600 p-3 rounded-full mb-2">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Neck</h4>
                  <p className="text-xs text-zinc-400">
                    Combina características de diferentes escalas para melhorar a detecção.
                  </p>
                </div>
                {/* Head */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-center text-center">
                  <span className="bg-purple-600 p-3 rounded-full mb-2">
                    <SquareTerminal className="h-6 w-6 text-white" />
                  </span>
                  <h4 className="font-semibold text-white mb-1">Head</h4>
                  <p className="text-xs text-zinc-400">
                    Gera as previsões finais de caixas e classes.
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
                Para treinar o YOLO, o dataset consiste em imagens acompanhadas por arquivos de anotação que descrevem a localização e a classe de cada objeto.
              </p>
              
              {/* Tabela de Colunas do Dataset */}
              <div className="overflow-x-auto mb-6 bg-zinc-800 rounded-lg">
                <table className="w-full text-left min-w-[600px] text-sm">
                  <thead className="text-zinc-400 uppercase tracking-wide">
                    <tr className="border-b border-zinc-700">
                      <th className="py-3 px-4">Campo</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Exemplo</th>
                      <th className="py-3 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-700 text-zinc-300">
                      <td className="py-3 px-4 font-mono">image_path</td>
                      <td className="py-3 px-4">string</td>
                      <td className="py-3 px-4">"car_01.jpg"</td>
                      <td className="py-3 px-4">Localização do arquivo de imagem.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 bg-zinc-850 text-zinc-300">
                      <td className="py-3 px-4 font-mono">class_id</td>
                      <td className="py-3 px-4">int</td>
                      <td className="py-3 px-4">2</td>
                      <td className="py-3 px-4">ID numérico da classe do objeto.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 text-zinc-300">
                      <td className="py-3 px-4 font-mono">bbox_x</td>
                      <td className="py-3 px-4">float</td>
                      <td className="py-3 px-4">0.51</td>
                      <td className="py-3 px-4">Coordenada X do centro da caixa.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 bg-zinc-850 text-zinc-300">
                      <td className="py-3 px-4 font-mono">bbox_y</td>
                      <td className="py-3 px-4">float</td>
                      <td className="py-3 px-4">0.78</td>
                      <td className="py-3 px-4">Coordenada Y do centro da caixa.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 text-zinc-300">
                      <td className="py-3 px-4 font-mono">bbox_width</td>
                      <td className="py-3 px-4">float</td>
                      <td className="py-3 px-4">0.12</td>
                      <td className="py-3 px-4">Largura normalizada da caixa.</td>
                    </tr>
                    <tr className="border-b border-zinc-700 bg-zinc-850 text-zinc-300">
                      <td className="py-3 px-4 font-mono">bbox_height</td>
                      <td className="py-3 px-4">float</td>
                      <td className="py-3 px-4">0.25</td>
                      <td className="py-3 px-4">Altura normalizada da caixa.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Coluna da Direita (Métricas e Utilidade) */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            {/* Card: Métricas de Avaliação */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="h-6 w-6 text-orange-400" />
                <h3 className="text-2xl font-bold text-white text-left">Métricas de Avaliação</h3>
              </div>
              <p className="text-zinc-400 mb-6 text-sm md:text-base text-left">
                A precisão do YOLO é medida por métricas que combinam a localização e a classificação dos objetos.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {/* Mini Card 1: mAP */}
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col justify-start items-start">
                  <div className="flex justify-between w-full items-center">
                    <p className="text-orange-400 text-3xl font-bold">95.1%</p>
                    <div className="flex items-center text-emerald-400">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      <span className="font-semibold text-sm">Excelente</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">mAP (Mean Average Precision)</p>
                  <p className="text-xs text-zinc-500 mt-1">A métrica principal. Avalia a precisão média de detecção do modelo para todas as classes.</p>
                </div>
                {/* Mini Card 2: IoU */}
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col justify-start items-start">
                  <div className="flex justify-between w-full items-center">
                    <p className="text-orange-400 text-3xl font-bold">0.89</p>
                    <div className="flex items-center text-emerald-400">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      <span className="font-semibold text-sm">Excelente</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">IoU (Intersection over Union)</p>
                  <p className="text-xs text-zinc-500 mt-1">Mede a sobreposição entre a caixa prevista e a caixa real. Um valor alto indica uma localização precisa.</p>
                </div>
                {/* Mini Card 3: Class Confidence */}
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col justify-start items-start">
                  <div className="flex justify-between w-full items-center">
                    <p className="text-orange-400 text-3xl font-bold">97%</p>
                    <div className="flex items-center text-emerald-400">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      <span className="font-semibold text-sm">Ótimo</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">Confiança da Classe</p>
                  <p className="text-xs text-zinc-500 mt-1">A certeza do modelo de que o objeto detectado pertence a uma classe específica. Valores próximos de 100% são ideais.</p>
                </div>
              </div>
            </div>
            
            {/* Card: Aplicações Práticas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="h-6 w-6 text-amber-400" />
                <h3 className="text-2xl font-bold text-white text-left">Aplicações Práticas</h3>
              </div>
              <p className="text-zinc-400 mb-6 text-sm md:text-base text-left">
                A velocidade e precisão do YOLO o tornam essencial em diversas áreas que exigem análise visual em tempo real.
              </p>
              <div className="grid grid-cols-1 gap-4 text-zinc-400">
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex items-start gap-3">
                  <Car className="h-6 w-6 text-amber-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-base text-amber-300 mb-1 text-left">Veículos Autônomos</h4>
                    <p className="text-sm text-left">
                      Identificação de pedestres, carros, semáforos e placas de trânsito para navegação segura.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex items-start gap-3">
                  <Box className="h-6 w-6 text-amber-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-base text-amber-300 mb-1 text-left">Varejo e Indústria</h4>
                    <p className="text-sm text-left">
                      Controle de estoque, análise de prateleiras e automação de linhas de produção.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex items-start gap-3">
                  <Video className="h-6 w-6 text-amber-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-base text-amber-300 mb-1 text-left">Segurança e Vigilância</h4>
                    <p className="text-sm text-left">
                      Monitoramento de multidões, detecção de atividades suspeitas e identificação de objetos.
                    </p>
                  </div>
                </div>
              </div>
            </div>


            {/* Card: Gráfico de Treinamento */}
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
        </div>
      </div>
    </section>
  );
};

export default YoloDetectionSection;
