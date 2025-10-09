"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from 'react';
import Header from "@/components/Header"; 
import Footer from "@/components/Footer";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  ChevronDown, 
  ChevronUp, 
  Lightbulb, 
  Target, 
  MapPin, 
  Brain, 
  LayoutDashboard, 
  Crosshair, 
  ChartSpline,
  Search,
  FileText,
  AlertTriangle,
  Satellite,
  ShieldCheck,
  GitMerge,
  ArrowRight,
  BrainCircuit
} from 'lucide-react';
import { motion } from "framer-motion";


// --- Componente de Tooltip Customizado ---
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-xl">
        <p className="text-zinc-300 font-bold mb-1">{`Mês: ${label} (2024)`}</p>
        {payload.map((item, index) => (
          <p key={index} className="flex items-center text-sm">
            <span style={{ color: item.color }} className="mr-2">•</span>
            <span className="font-semibold" style={{ color: item.color }}>
              {`${item.name}: `}
            </span>
            <span className="text-white">{item.value} casos</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- Dados para o FAQ ---
interface FAQItem {
  question: string;
  answer: string;
}



// --- Dados de Exemplo para Gráficos (agora com flutuações e previsão em queda) ---
const dengueCasesData = [
  { month: "Jan", cases: 120, forecast: null },
  { month: "Jan", cases: 180, forecast: null },
  { month: "Fev", cases: 250, forecast: null },
  { month: "Fev", cases: 210, forecast: null },
  { month: "Mar", cases: 280, forecast: null },
  { month: "Mar", cases: 230, forecast: null },
  { month: "Abr", cases: 170, forecast: null },
  { month: "Abr", cases: 140, forecast: null },
  { month: "Mai", cases: 100, forecast: null },
  { month: "Mai", cases: 115, forecast: null },
  { month: "Jun", cases: 130, forecast: null },
  { month: "Jun", cases: 180, forecast: null },
  { month: "Jul", cases: 220, forecast: null },
  { month: "Jul", cases: 260, forecast: null },
  { month: "Ago", cases: 240, forecast: null },
  { month: "Ago", cases: 290, forecast: null },
  { month: "Set", cases: 250, forecast: null },
  { month: "Set", cases: 210, forecast: null },
  { month: "Out", cases: 190, forecast: null },
  { month: "Out", cases: 160, forecast: null },
  { month: "Nov", cases: 190, forecast: 190 }, 
  { month: "Nov", cases: null, forecast: 240 },
  { month: "Dez", cases: null, forecast: 190 },
  { month: "Dez", cases: null, forecast: 160 }
];


export default function About() {
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen font-sans text-white">
      
      {/* --- Fundo com Gradiente e Pontilhados --- */}
      <div className="background-container"></div>

      <Header />

      <main className="pt-28 max-w-7xl mx-auto px-4">

      {/* --- 1. Seção de Hero / Introdução --- */}
      <section id="inicio" className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center gap-6 mb-32">
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 animate-fade-in-up">
          Tecnologia Apoiando na Linha de Frente no Combate à Dengue
        </h1>
        <p className="max-w-3xl text-zinc-300 text-lg sm:text-xl leading-relaxed animate-fade-in-up delay-200">
          Ações inteligentes e proativas contra a dengue, com IAs que preveem surtos e detectam focos do mosquito com eficiência.
        </p>
        <div className="mt-8 animate-fade-in-up delay-300 flex flex-col items-center gap-4">
          <Link 
            href="#ferramentas" 
            className="bg-zinc-800 text-white font-bold py-3 px-8 rounded-full border border-zinc-700 shadow-lg transform transition-all duration-300 hover:bg-zinc-700 hover:border-zinc-500 hover:shadow-xl flex items-center gap-2"
          >
            Explore o Projeto
          </Link>
        </div>
      </section>


      <hr id="ferramentas" className="border-zinc-800 mb-24" />

        
      <section className="max-w mx-auto mb-24 text-center">
  <div className="mb-12 animate-fade-in-up">
    <h2 className="text-2xl font-bold text-blue-400 mb-2">Para Agentes de Saúde e Gestores</h2>
    <h3 className="text-4xl font-bold text-white">Nossas Ferramentas de Análise</h3>
    <p className="text-zinc-300 text-lg mt-4 max-w-3xl mx-auto">
      Um ecossistema de dados para um planejamento de ações preventivas - O Painel de Análise
    </p>
  </div>
  
  <div className="flex flex-col md:flex-row items-center justify-center gap-8">


    <Link href="/predict" className="group relative flex flex-col p-6 rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 shadow-xl transition-all duration-300 animate-fade-in-up delay-200 overflow-hidden max-w-sm w-full">
      <div className="flex-grow">
        <div className="flex items-center justify-center bg-green-900/50 border border-green-700 w-14 h-14 rounded-full mb-6 mx-auto text-green-300 group-hover:bg-green-800/50 transition-colors duration-300">
          <ChartSpline size={32} />
        </div>
        <h4 className="text-2xl font-semibold text-green-300 mb-3">Previsão de Surtos</h4>
        <p className="text-zinc-300 leading-relaxed">Um modelo preditivo que projeta a evolução de surtos de dengue a nível municipal.</p>
      </div>
      <span className="mt-6 text-sm font-semibold text-green-400 group-hover:text-green-300 transition-colors">Acessar ferramenta</span>
    </Link>

    <span className="hidden md:block text-5xl text-white font-light mx-4 animate-fade-in-up delay-100">+</span>

    <Link href="/detect" className="group relative flex flex-col p-6 rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 shadow-xl transition-all duration-300 animate-fade-in-up relative overflow-hidden max-w-sm w-full">
      <div className="flex-grow">
        <div className="flex items-center justify-center bg-blue-900/50 border border-blue-700 w-14 h-14 rounded-full mb-6 mx-auto text-blue-300 group-hover:bg-blue-800/50 transition-colors duration-300">
          <Crosshair size={32} />
        </div>
        <h4 className="text-2xl font-semibold text-blue-300 mb-3">Detecção de Focos</h4>
        <p className="text-zinc-300 leading-relaxed">Nossa IA identifica potenciais criadouros do Aedes aegypti em imagens aéreas.</p>
      </div>
      <span className="mt-6 text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">Acessar ferramenta</span>
    </Link>

    <span className="hidden md:block text-5xl text-white font-light mx-4 animate-fade-in-up delay-300">=</span>

    <Link href="/dashboard" className="group relative flex flex-col p-6 rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-indigo-500/80 shadow-xl animate-fade-in-up delay-400 relative overflow-hidden max-w-sm w-full">
      <motion.span
        className="absolute inset-0 block h-full w-full bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)",
          backgroundSize: "250% 250%",
        }}
        animate={{ backgroundPosition: ["100% 100%", "0% 0%"] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
      <div className="flex-grow">
        <div className="flex items-center justify-center bg-indigo-900/50 border border-indigo-700 w-14 h-14 rounded-full mb-6 mx-auto text-indigo-300 group-hover:bg-indigo-800/50 transition-colors duration-300">
          <LayoutDashboard size={32} />
        </div>
        <h4 className="text-2xl font-semibold text-indigo-300 mb-3">Painel de Análise</h4>
        <p className="text-zinc-300 leading-relaxed">Visualize insights dos modelos de previsão e detecção para guiar a tomada de decisão e o planejamento.</p>
      </div>
      <span className="mt-6 text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">Explorar o painel</span>
    </Link>
  </div>
</section>

   
        
        <hr className="border-zinc-800 mb-24" />

        {/* --- 3. Seção de Missão e Visão --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4">
          <h3 className="text-4xl font-bold text-white mb-12 text-center animate-fade-in-up">Nosso Propósito</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Missão Card */}
            <div className="bg-zinc-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-zinc-800">
              <div className="flex items-center justify-center bg-blue-900/50 border border-blue-700 w-16 h-16 rounded-full mb-6 mx-auto text-blue-300">
                <Target size={32} />
              </div>
              <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4 text-center">Missão</h4>
              <p className="text-zinc-300 text-lg leading-relaxed text-center">
                Desenvolver e fornecer ferramentas de inteligência artificial que permitam a detecção de focos, a previsão precoce de surtos e, portanto, a otimização de recursos no combate à dengue.
              </p>
            </div>
            {/* Visão Card */}
            <div className="bg-zinc-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-zinc-800">
              <div className="flex items-center justify-center bg-green-900/50 border border-green-700 w-16 h-16 rounded-full mb-6 mx-auto text-green-300">
                <Lightbulb size={32} />
              </div>
              <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-4 text-center">Visão</h4>
              <p className="text-zinc-300 text-lg leading-relaxed text-center">
                Tornar-se uma referência técnica na aplicação de IA para o monitoramento e controle de arboviroses, contribuindo para um futuro com sistemas de saúde mais resilientes e proativos.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-zinc-800 mb-24" />
        
        {/* --- 4. Seção Antes e Depois --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4 animate-fade-in-up">
           <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-green-400 mb-2">Inovação em Saúde Pública</h2>
            <h3 className="text-4xl font-bold text-white">Uma Mudança de Paradigma no Combate à Dengue</h3>
            <p className="text-zinc-300 text-lg mt-4 max-w-3xl mx-auto">
              Da abordagem reativa à estratégia proativa e orientada por dados. Veja a diferença.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 bg-zinc-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-zinc-800 p-8">
            {/* Bloco "Antes" */}
            <div className="flex-1 space-y-6 md:border-r md:border-zinc-700 md:pr-8">
              <h4 className="text-2xl font-bold text-red-400">Abordagem Tradicional</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Search size={24} className="text-red-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <h5 className="font-semibold text-lg text-white">Detecção Manual e Lenta</h5>
                    <p className="text-zinc-400 text-base">Vistorias de campo pontuais, resultando na identificação tardia de focos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <FileText size={24} className="text-red-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <h5 className="font-semibold text-lg text-white">Dados Isolados</h5>
                    <p className="text-zinc-400 text-base">Coleta descentralizada, dificultando análises preditivas e a visão macro.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-red-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <h5 className="font-semibold text-lg text-white">Ações Reativas</h5>
                    <p className="text-zinc-400 text-base">Ações de controle iniciadas majoritariamente após o aumento de casos.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bloco "Depois" */}
            <div className="flex-1 space-y-6 md:pl-8 mt-8 md:mt-0">
              <h4 className="text-2xl font-bold text-green-400">Com PreviDengue</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Satellite size={24} className="text-green-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <h5 className="font-semibold text-lg text-white">Detecção Automatizada e Ágil</h5>
                    <p className="text-zinc-400 text-base">Análise de imagens em larga escala por IA para mapeamento rápido de áreas de risco.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <ChartSpline size={24} className="text-green-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <h5 className="font-semibold text-lg text-white">Análise Preditiva</h5>
                    <p className="text-zinc-400 text-base">Uso de Machine Learning para prever surtos, otimizando a alocação de recursos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <ShieldCheck size={24} className="text-green-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <h5 className="font-semibold text-lg text-white">Estratégias Proativas</h5>
                    <p className="text-zinc-400 text-base">Ações preventivas direcionadas aos locais de maior risco antes da escalada de casos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-zinc-800 mb-24" />

        {/* --- 5. Seção Como Funciona --- */}
        <section className="max-w-6xl mx-auto mb-24 text-center">
            <div className="mb-12 animate-fade-in-up">
                <h2 className="text-2xl font-bold text-indigo-400 mb-2">Para Avaliadores e Curiosos</h2>
                <h3 className="text-4xl font-bold text-white">A Metodologia por Trás do PreviDengue</h3>
                <p className="text-zinc-300 text-lg mt-4 max-w-3xl mx-auto">
                    Nossa abordagem combina tecnologias de ponta em um fluxo de três etapas para máxima eficácia.
                </p>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-zinc-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-zinc-800 flex flex-col items-center group animate-fade-in-up delay-200">
              <div className="bg-blue-900/50 p-4 rounded-full mb-6 border border-blue-700">
                <MapPin size={36} className="text-blue-300" />
              </div>
              <h4 className="text-2xl font-semibold text-blue-300 mb-3">1. Detecção Inteligente</h4>
              <p className="text-zinc-300 leading-relaxed">
                Visão computacional analisa imagens de drones, identificando possíveis focos (piscinas, caixas d&apos;água) para mapear áreas de risco.
              </p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-zinc-800 flex flex-col items-center group animate-fade-in-up delay-300">
              <div className="bg-green-900/50 p-4 rounded-full mb-6 border border-green-700">
                <Brain size={36} className="text-green-300" />
              </div>
              <h4 className="text-2xl font-semibold text-green-300 mb-3">2. Análise Preditiva</h4>
              <p className="text-zinc-300 leading-relaxed">
                Modelos de Machine Learning processam dados históricos e climáticos para prever a incidência de casos futuros.
              </p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-zinc-800 flex flex-col items-center group animate-fade-in-up delay-400">
              <div className="bg-indigo-900/50 p-4 rounded-full mb-6 border border-indigo-700">
                <GitMerge size={36} className="text-indigo-300" />
              </div>
              <h4 className="text-2xl font-semibold text-indigo-300 mb-3">3. Interconexão de Dados</h4>
              <p className="text-zinc-300 leading-relaxed">
                Correlacionamos os focos detectados com as previsões para gerar insights acionáveis, exibidos em um painel estratégico.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-zinc-800 mb-24" />

{/* --- 6. Seção de Gráficos de Previsão --- */}
<section className="max-w-6xl mx-auto mb-24 rounded-2xl ">
  <h3 className="text-4xl font-bold text-white mb-4 text-center">Projeção de Casos</h3>
  <p className="text-zinc-300 text-lg mb-8 text-center max-w-3xl mx-auto">
    Este gráfico exemplo ilustra como nosso modelo compara dados históricos com projeções futuras, uma ferramenta vital para o planejamento antecipado.
  </p>
  <div className="mb-4">
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={dengueCasesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#fef08a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="month" stroke="#999" tick={{ fill: '#bbb' }} />
        <YAxis stroke="#999" label={{ value: 'Número de Casos', angle: -90, position: 'insideLeft', fill: '#999', style: { textAnchor: 'middle' } }} tick={{ fill: '#bbb' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(120, 119, 198, 0.1)' }} />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <Area type="monotone" dataKey="cases" name="Casos Reais" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCases)" />
        <Area type="monotone" dataKey="forecast" name="Previsão" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={3} fillOpacity={1} fill="url(#colorForecast)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</section>


        <hr className="border-zinc-800 mb-24" />
        
        {/* --- 7. Seção de Imagem de Destaque --- */}
        <section className="max-w-6xl mx-auto mb-24 text-center animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-4">Detecção de Focos</h3>
          <p className="text-zinc-300 text-lg mb-10 max-w-3xl mx-auto">
            A visão computacional permite analisar vastas áreas, identificando potenciais criadouros. Veja um exemplo de como a IA processa uma imagem aérea.
          </p>
          <div className="relative w-full h-130 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700">
            <Image
              src="/images/detected1.png"
              alt="Exemplo de imagem aérea com focos de dengue detectados pela IA"
              width={1200}
              height={130}
              className="object-cover"
            />
          </div>
          <p className="text-zinc-500 text-sm mt-4">
            *Imagem ilustrativa de uma área de análise hipotética.
          </p>
        </section>

        <hr className="border-zinc-800 mb-24" />


        <section className="max-w-6xl mx-auto mb-24 text-center">
          <h3 className="text-4xl font-bold text-white mb-4 animate-fade-in-up">Nossa Equipe</h3>
          <p className="text-zinc-300 text-lg mb-12 max-w-3xl mx-auto animate-fade-in-up delay-100">
            Estudantes de informática dedicados a construir soluções com impacto significativo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div
              className="p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 shadow-xl flex flex-col items-center text-left transform transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/80 animate-fade-in-up relative overflow-hidden card-hover-glow"
              style={{ animationDelay: `0.2s` }}
            >
              <a href={`https://github.com/arthurgamajorge`} target="_blank" rel="noopener noreferrer">
                <Image
                  src="/images/arthur.png"
                  alt="Foto de perfil de Arthur Gama Jorge"
                  width={120}
                  height={120}
                  className="rounded-full mx-auto mb-5 border-4 border-zinc-700 group-hover:border-blue-500 shadow-lg transition-all duration-300 hover:scale-105"
                />
              </a>
              <h4 className="text-white font-bold text-1xl mb-1">Arthur Gama Jorge</h4>
              {/* Subtítulo adicionado conforme a solicitação */}
              <p className="text-zinc-400 mt-1">Estudante de Informática</p>
              {/* Links de GitHub e LinkedIn */}
              <div className="flex justify-center gap-4 mt-6">
                <a
                  href={`https://github.com/arthurgamajorge`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.046.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.8.576 4.765-1.589 8.197-6.094 8.197-11.387 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-semibold">GitHub</span>
                </a>
                <a
                  href={`https://www.linkedin.com/in/arthurgamajorge`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.765s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.765-1.75 1.765zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <span className="font-semibold">LinkedIn</span>
                </a>
              </div>
            </div>
            <div
              className="p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 shadow-xl flex flex-col items-center text-left transform transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/80 animate-fade-in-up relative overflow-hidden card-hover-glow"
              style={{ animationDelay: `0.3s` }}
            >
              <a href={`https://github.com/danieldorigancc`} target="_blank" rel="noopener noreferrer">
                <Image
                  src="/images/daniel.png"
                  alt="Foto de perfil de Daniel Dorigan de Carvalho Campos"
                  width={120}
                  height={120}
                  className="rounded-full mx-auto mb-5 border-4 border-zinc-700 group-hover:border-blue-500 shadow-lg transition-all duration-300 hover:scale-105"
                />
              </a>
              <h4 className="text-white font-bold text-1xl mb-1">Daniel Dorigan de Carvalho Campos</h4>
              {/* Subtítulo adicionado conforme a solicitação */}
              <p className="text-zinc-400 mt-1">Estudante de Informática</p>
              {/* Links de GitHub e LinkedIn */}
              <div className="flex justify-center gap-4 mt-6">
                <a
                  href={`https://github.com/danieldorigancc`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.046.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.8.576 4.765-1.589 8.197-6.094 8.197-11.387 0-6.627-5.373-12-12-12z" />
                    </svg>
                  <span className="font-semibold">GitHub</span>
                </a>
                <a
                  href={`https://www.linkedin.com/in/danieldorigancc`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.765s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.765-1.75 1.765zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <span className="font-semibold">LinkedIn</span>
                </a>
              </div>
            </div>
            <div
              className="p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 shadow-xl flex flex-col items-center text-left transform transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/80 animate-fade-in-up relative overflow-hidden card-hover-glow"
              style={{ animationDelay: `0.4s` }}
            >
              <a href={`https://github.com/ionmateus`} target="_blank" rel="noopener noreferrer">
                <Image
                  src="/images/ion.png"
                  alt="Foto de perfil de Ion Mateus Nunes Oprea"
                  width={120}
                  height={120}
                  className="rounded-full mx-auto mb-5 border-4 border-zinc-700 group-hover:border-blue-500 shadow-lg transition-all duration-300 hover:scale-105"
                />
              </a>
              <h4 className="text-white font-bold text-1xl mb-1">Ion Mateus Nunes Oprea</h4>
              {/* Subtítulo adicionado conforme a solicitação */}
              <p className="text-zinc-400 mt-1">Estudante de Informática</p>
              {/* Links de GitHub e LinkedIn */}
              <div className="flex justify-center gap-4 mt-6">
                <a
                  href={`https://github.com/ionmateus`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.046.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.8.576 4.765-1.589 8.197-6.094 8.197-11.387 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-semibold">GitHub</span>
                </a>
                <a
                  href={`https://www.linkedin.com/in/ionmateus`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.765s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.765-1.75 1.765zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <span className="font-semibold">LinkedIn</span>
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
