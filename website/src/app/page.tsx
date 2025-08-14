"use client";

import Image from "next/image";
import Link from "next/link";
import React from 'react';
import Header from "@/components/Header"; // Componente de Cabeçalho
import Footer from "@/components/Footer"; // Componente de Rodapé
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  GitMerge
} from 'lucide-react';


const teamMembers = [
  {
    name: "Arthur Gama Jorge",
    github: "arthurgamajorge",
    avatar: "/images/arthur.png",
    contributions: [
      "Criação da interface do usuário (UI/UX) e design de componentes",
      "Implementação do front-end com Next.js",
      "Otimização de performance da aplicação",
    ],
  },
  {
    name: "Daniel Dorigan de Carvalho Campos",
    github: "danieldorigancc",
    avatar: "/images/daniel.png",
    contributions: [
      "Desenvolvimento do back-end da API de previsão",
      "Integração do modelo de IA",
      "Gerenciamento de banco de dados e pipelines de ETL",
    ],
  },
  {
    name: "Ion Mateus Nunes Oprea",
    github: "ionmateus",
    avatar: "/images/ion.png",
    contributions: [
      "Desenvolvimento do modelo de detecção de foco por IA",
      "Processamento e análise de dados geoespaciais",
      "Validação e ajuste de algoritmos de Machine Learning",
    ],
  },
];


// --- Dados de Exemplo para Gráficos ---
// Simula dados históricos e uma projeção futura de casos de dengue.
const dengueCasesData = [
  { month: 'Jan', cases: 150 },
  { month: 'Fev', cases: 180 },
  { month: 'Mar', cases: 250 },
  { month: 'Abr', cases: 220 },
  { month: 'Mai', cases: 190 },
  { month: 'Jun', cases: 160 },
  { month: 'Jul', cases: 140 },
  { month: 'Ago', cases: 170 },
  { month: 'Set', cases: 200, forecast: 200 }, 
  { month: 'Out', cases: null, forecast: 230 },
  { month: 'Nov', cases: null, forecast: 270 },
  { month: 'Dez', cases: null, forecast: 210 },
];

// --- Componente de Tooltip Customizado para o Gráfico ---
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
        <p className="text-zinc-400 font-bold mb-1">{`Mês: ${label} (2024)`}</p>
        {payload.map((item, index) => (
          <p key={index} className="flex items-center text-sm">
            <span style={{ color: item.stroke }} className="mr-2">•</span>
            <span className="font-semibold" style={{ color: item.stroke }}>
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

const faqs: FAQItem[] = [
  {
    question: "Como o PreviDengue detecta os focos do mosquito?",
    answer: "Utilizamos algoritmos de visão computacional, treinados com um vasto dataset de imagens, para identificar padrões e objetos em imagens aéreas (drones e satélites) que são indicativos de potenciais criadouros do Aedes aegypti, como piscinas descobertas, caixas d'água sem tampa e acúmulo de resíduos. A tecnologia permite uma varredura eficiente e em larga escala, superando as limitações da inspeção manual."
  },
  {
    question: "Qual a precisão do sistema na detecção e previsão?",
    answer: "Nossos modelos de detecção atingem uma precisão superior a 90% na identificação de objetos, variando conforme a resolução da imagem e as condições ambientais. Para a previsão de surtos, integramos dados históricos, climáticos e sociodemográficos para gerar projeções robustas que auxiliam na alocação de recursos e em ações preventivas. A validação dos modelos é um processo contínuo."
  }
];


export default function About() {
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-4 py-12">
      <Header />

      <main className="pt-28 max-w-7xl mx-auto">

        {/* --- 1. Seção de Hero / Introdução --- */}
        <section className="text-center flex flex-col items-center justify-center gap-6 mb-24 px-4">
          <h2 className="text-5xl sm:text-7xl font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 animate-fade-in-up">
            Tecnologia e Dados no Combate à Dengue
          </h2>
          <p className="max-w-2xl text-zinc-200 text-lg sm:text-xl leading-relaxed animate-fade-in-up delay-200">
            Nossa plataforma integra Inteligência Artificial para detecção de focos e previsão de surtos, fornecendo uma ferramenta estratégica para a saúde pública.
          </p>
          <div className="mt-8 animate-fade-in-up delay-300">
            <Link href="/#ferramentas" className="bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transform transition-all duration-300 hover:-translate-y-1 block text-center">
              Explore as Ferramentas
            </Link>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 2. Seção de Ferramentas --- */}
        <section id="ferramentas" className="max-w mx-auto mb-24 px-4 text-center">
          <h3 className="text-4xl font-bold text-white mb-12 animate-fade-in-up">Ecossistema PreviDengue</h3>
          <p className="text-zinc-200 text-lg mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Conheça as funcionalidades integradas que o PreviDengue oferece para otimizar o controle e a prevenção da dengue.
          </p>
          <div className="flex items-center justify-center space-x-4 md:space-x-8 lg:space-x-12 flex-wrap">
            <Link href="/detect" className="flex-1 min-w-[280px] h-full p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl transform transition-all duration-300 hover:scale-[1.03] hover:border-blue-600 group animate-fade-in-up">
              <div className="flex items-center justify-center bg-blue-700 w-14 h-14 rounded-full mb-6 mx-auto text-white group-hover:bg-blue-600 transition-colors duration-300">
                <Crosshair size={32} />
              </div>
              <h4 className="text-2xl font-semibold text-blue-300 mb-3">Detecção de Focos</h4>
              <p className="text-zinc-200 leading-relaxed">Utilize nossa IA para identificar potenciais criadouros do Aedes aegypti em imagens aéreas.</p>
            </Link>

            <div className="text-5xl font-bold text-white my-8 md:my-0">+</div>

            <Link href="/predict" className="flex-1 min-w-[280px] h-full p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl transform transition-all duration-300 hover:scale-[1.03] hover:border-green-600 group animate-fade-in-up">
              <div className="flex items-center justify-center bg-green-700 w-14 h-14 rounded-full mb-6 mx-auto text-white group-hover:bg-green-600 transition-colors duration-300">
                <ChartSpline size={32} />
              </div>
              <h4 className="text-2xl font-semibold text-green-300 mb-3">Previsão de Surtos</h4>
              <p className="text-zinc-200 leading-relaxed">Acesse modelos preditivos para antecipar áreas de maior risco epidemiológico.</p>
            </Link>

            <div className="text-5xl font-bold text-white my-8 md:my-0">=</div>

            <Link href="/dashboard" className="flex-1 min-w-[280px] h-full p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl transform transition-all duration-300 hover:scale-[1.03] hover:border-indigo-600 group animate-fade-in-up">
              <div className="flex items-center justify-center bg-indigo-700 w-14 h-14 rounded-full mb-6 mx-auto text-white group-hover:bg-indigo-600 transition-colors duration-300">
                <LayoutDashboard size={32} />
              </div>
              <h4 className="text-2xl font-semibold text-indigo-300 mb-3">Dashboard Interativo</h4>
              <p className="text-zinc-200 leading-relaxed">Visualize dados e insights para guiar a tomada de decisão e o planejamento estratégico.</p>
            </Link>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 3. Seção de Missão e Visão --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4">
          <h3 className="text-4xl font-bold text-white mb-12 text-center animate-fade-in-up">Nosso Propósito</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800">
              <div className="flex items-center justify-center bg-blue-600 w-16 h-16 rounded-full mb-6 mx-auto text-white">
                <Target size={32} />
              </div>
              <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4 text-center">Missão</h4>
              <p className="text-zinc-200 text-lg leading-relaxed text-center">
                Desenvolver e fornecer ferramentas de inteligência artificial que permitam a detecção precoce de focos, a previsão de surtos e a otimização de recursos no combate à dengue.
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800">
              <div className="flex items-center justify-center bg-green-600 w-16 h-16 rounded-full mb-6 mx-auto text-white">
                <Lightbulb size={32} />
              </div>
              <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-4 text-center">Visão</h4>
              <p className="text-zinc-200 text-lg leading-relaxed text-center">
                Tornar-se uma referência técnica na aplicação de IA para o monitoramento e controle de arboviroses, contribuindo para um futuro com sistemas de saúde mais resilientes e proativos.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />
        
        {/* --- 4. Seção Antes e Depois --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4 animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-10 text-center">Uma Mudança de Paradigma no Combate à Dengue</h3>
          <p className="text-zinc-200 text-lg mb-12 text-center max-w-2xl mx-auto">
            Da abordagem reativa à estratégia proativa e data-driven.
          </p>
          <div className="flex flex-col md:flex-row gap-8 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 p-8">
            {/* Bloco "Antes" (Abordagem Tradicional) */}
            <div className="flex-1 space-y-6 md:border-r md:border-zinc-700 md:pr-8">
              <h4 className="text-2xl font-bold text-red-500">Abordagem Tradicional</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Search size={24} className="text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-lg text-white">Detecção Manual e Lenta</h5>
                    <p className="text-zinc-400 text-base">Vistorias de campo pontuais e demoradas, resultando na identificação tardia de focos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <FileText size={24} className="text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-lg text-white">Dados Isolados</h5>
                    <p className="text-zinc-400 text-base">Coleta de dados descentralizada, dificultando análises preditivas e a visão macro do problema.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-lg text-white">Ações Reativas</h5>
                    <p className="text-zinc-400 text-base">As ações de controle eram majoritariamente iniciadas após a confirmação do aumento de casos.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bloco "Depois" (Com PreviDengue) */}
            <div className="flex-1 space-y-6 md:pl-8 mt-8 md:mt-0">
              <h4 className="text-2xl font-bold text-green-500">Com PreviDengue</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Satellite size={24} className="text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-lg text-white">Detecção Automatizada e Ágil</h5>
                    <p className="text-zinc-400 text-base">Análise de imagens em larga escala por IA para mapeamento rápido e abrangente de áreas de risco.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <ChartSpline size={24} className="text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-lg text-white">Análise Preditiva</h5>
                    <p className="text-zinc-400 text-base">Uso de Machine Learning para processar dados e prever surtos, otimizando a alocação de recursos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <ShieldCheck size={24} className="text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-lg text-white">Estratégias Proativas</h5>
                    <p className="text-zinc-400 text-base">Permite ações preventivas direcionadas aos locais de maior risco antes da escalada de casos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 5. Seção Como Funciona --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4 text-center">
          <h3 className="text-4xl font-bold text-white mb-12 animate-fade-in-up">A Metodologia por Trás do PreviDengue</h3>
          <p className="text-zinc-200 text-lg mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Nossa abordagem integrada combina tecnologias de ponta para maximizar a eficácia no combate à dengue.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-zinc-900 p-8 rounded-xl shadow-xl border border-zinc-800 flex flex-col items-center group transform transition-all duration-300 hover:scale-[1.02] animate-fade-in-up delay-200">
              <div className="bg-blue-700 p-4 rounded-full mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <MapPin size={36} className="text-white" />
              </div>
              <h4 className="text-2xl font-semibold text-blue-300 mb-3">1. Detecção Inteligente</h4>
              <p className="text-zinc-200 leading-relaxed">
                Utilizamos visão computacional para analisar imagens de satélite e drones, identificando potenciais focos (como piscinas e caixas d&aposágua) com alta precisão para mapear áreas de risco.
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-xl shadow-xl border border-zinc-800 flex flex-col items-center group transform transition-all duration-300 hover:scale-[1.02] animate-fade-in-up delay-300">
              <div className="bg-green-700 p-4 rounded-full mb-6 group-hover:bg-green-600 transition-colors duration-300">
                <Brain size={36} className="text-white" />
              </div>
              <h4 className="text-2xl font-semibold text-green-300 mb-3">2. Análise Preditiva</h4>
              <p className="text-zinc-200 leading-relaxed">
                Nossos modelos de Machine Learning processam dados históricos, climáticos e geográficos para prever a incidência de casos, permitindo a alocação eficiente de recursos preventivos.
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-xl shadow-xl border border-zinc-800 flex flex-col items-center group transform transition-all duration-300 hover:scale-[1.02] animate-fade-in-up delay-400">
              <div className="bg-indigo-700 p-4 rounded-full mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                <GitMerge size={36} className="text-white" />
              </div>
              <h4 className="text-2xl font-semibold text-indigo-300 mb-3">3. Interconexão de Dados</h4>
              <p className="text-zinc-200 leading-relaxed">
                Correlacionamos os resultados da detecção de focos e da previsão de surtos para gerar insights acionáveis, exibidos em um dashboard que auxilia na tomada de decisões estratégicas.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 6. Seção de Gráficos de Previsão --- */}
        <section className="max-w-6xl mx-auto mb-24 p-6 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-8 text-center">Projeção de Casos de Dengue (Dados de Exemplo)</h3>
          <p className="text-zinc-200 text-lg mb-8 text-center max-w-2xl mx-auto">
            Acompanhe a evolução histórica de casos e a projeção futura gerada por nosso modelo, permitindo antecipar e planejar ações de combate.
          </p>
          <div className="mb-12">
            <h4 className="text-2xl font-semibold text-blue-400 mb-4 text-center">Casos Reais vs. Previsão Mensal</h4>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dengueCasesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="month" stroke="#999" tick={{ fill: '#bbb' }} />
                <YAxis stroke="#999" label={{ value: 'Número de Casos', angle: -90, position: 'insideLeft', fill: '#999', style: { textAnchor: 'middle' } }} tick={{ fill: '#bbb' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="cases" name="Casos Reais" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="forecast" name="Previsão" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 7. Seção de Imagem de Destaque --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4 text-center animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-10">Visualização Aérea e Identificação de Focos</h3>
          <p className="text-zinc-200 text-lg mb-12 max-w-2xl mx-auto">
            A tecnologia de visão computacional permite analisar vastas áreas, identificando com precisão potenciais criadouros. Veja um exemplo de como uma imagem aérea é processada.
          </p>
          <div className="relative w-full h-130 rounded-xl overflow-hidden shadow-2xl border border-zinc-700">
            <Image
              src="/images/detected1.png"
              alt="Exemplo de imagem aérea com focos de dengue detectados pela IA"
              width={1200}
              height={120}
              layout="responsive"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
          <p className="text-zinc-500 text-sm mt-4">
            *Imagem ilustrativa de uma área de análise hipotética.
          </p>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 8. Seção da Equipe --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4 text-center">
          <h3 className="text-4xl font-bold text-white mb-12 animate-fade-in-up">Nossa Equipe de Desenvolvimento</h3>
          <p className="text-zinc-200 text-lg mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Uma equipe multidisciplinar de com conhecimentos em IA, desenvolvimento e análise de dados, dedicados a construir soluções tecnológicas com impacto significativo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="p-8 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col items-center text-left transform transition-all duration-300 hover:scale-[1.03] hover:border-blue-500 animate-fade-in-up"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <Link href={`https://github.com/${member.github}`} target="_blank" rel="noopener noreferrer">
                  <Image
                    src={member.avatar}
                    alt={`Foto de perfil de ${member.name}`}
                    width={120}
                    height={120}
                    className="rounded-full mx-auto mb-5 border-4 border-blue-600 shadow-lg transition-transform duration-300 hover:scale-105"
                  />
                </Link>
                <h4 className="text-white font-bold text-2xl mb-1">{member.name}</h4>
                <div className="text-sm mt-3 text-zinc-400">
                  <ul className="list-disc list-inside space-y-1">
                    {member.contributions.map((contribution, contribIndex) => (
                      <li key={contribIndex}>{contribution}</li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`https://github.com/${member.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex items-center justify-center gap-2 text-blue-400 hover:text-blue-500 transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.046.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.8.576 4.765-1.589 8.197-6.094 8.197-11.387 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-semibold">@{member.github}</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 9. Seção de Perguntas Frequentes (FAQ) --- */}
        <section className="max-w-4xl mx-auto mb-24 px-4 animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-12 text-center">Perguntas Frequentes (FAQ)</h3>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-zinc-900 p-6 rounded-xl shadow-lg border border-zinc-800 cursor-pointer transition-all duration-300 hover:border-blue-600"
                onClick={() => toggleFAQ(index)}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-xl font-semibold text-blue-300">{faq.question}</h4>
                  {openFAQIndex === index ? <ChevronUp size={24} className="text-blue-400" /> : <ChevronDown size={24} className="text-zinc-400" />}
                </div>
                {openFAQIndex === index && (
                  <p className="mt-4 text-zinc-200 leading-relaxed animate-fade-in-down">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      <Footer />

      {/* --- Estilos de Animação Globais --- */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0; /* Garante que o elemento comece invisível */
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }

        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
