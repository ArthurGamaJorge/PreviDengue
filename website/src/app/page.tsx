// app/about/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header"; // Importe seu Header
import Footer from "@/components/Footer"; // Importe seu Footer
import { useState } from "react"; // Para o FAQ
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'; // Para os gráficos
import { ChevronDown, ChevronUp, Lightbulb, Target, MapPin, Brain, Megaphone, Gauge, FlaskConical, LayoutDashboard, Gamepad2, HeartHandshake } from 'lucide-react'; // Ícones (instale: npm install lucide-react)


// --- Dados de Exemplo para Gráficos ---
const dengueCasesData = [
  { month: 'Jan', cases: 150 },
  { month: 'Fev', cases: 180 },
  { month: 'Mar', cases: 250 },
  { month: 'Abr', cases: 220 },
  { month: 'Mai', cases: 190 },
  { month: 'Jun', cases: 160 },
  { month: 'Jul', cases: 140 },
  { month: 'Ago', cases: 170 },
  { month: 'Set', cases: 200 },
  // Linha de previsão começa aqui (Setembro a Dezembro)
  { month: 'Out', cases: null, forecast: 230 },
  { month: 'Nov', cases: null, forecast: 270 },
  { month: 'Dez', cases: null, forecast: 210 },
];

const objectDetectionCounts = [
  { object: 'Piscina', count: 450 },
  { object: 'Caixa D\'Água', count: 320 },
  { object: 'Pneu', count: 180 },
  { object: 'Lixo', count: 600 },
  { object: 'Outros Recipientes', count: 250 },
];

// --- Dados de Exemplo para a Equipe ---
const teamMembers = [
  {
    name: "Arthur Gama Jorge",
    github: "arthurgamajorge",
    avatar: "https://avatars.githubusercontent.com/u/129080603?v=4",
    role: "Desenvolvedor Backend & IA"
  },
  {
    name: "Daniel Dorigan de Carvalho Campos",
    github: "DanielDoriganCC",
    avatar: "https://avatars.githubusercontent.com/u/129087589?v=4",
    role: "Desenvolvedor Frontend & UI/UX"
  },
  {
    name: "Ion Mateus Nunes Oprea",
    github: "ionmateus",
    avatar: "https://avatars.githubusercontent.com/u/90868424?v=4",
    role: "Líder de Projeto & IA"
  },
];

// --- Dados de Exemplo para FAQ ---
interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Como o PreviDengue detecta os focos?",
    answer: "Utilizamos algoritmos avançados de visão computacional, treinados com milhares de imagens, para identificar padrões e objetos em imagens aéreas (de drones e satélites) que são indicativos de potenciais criadouros do mosquito Aedes aegypti, como piscinas descobertas, caixas d'água sem tampa, pneus e outros recipientes que acumulam água. A tecnologia permite uma varredura eficiente de grandes áreas, superando as limitações da inspeção manual."
  },
  {
    question: "Qual a precisão do sistema na detecção e previsão?",
    answer: "Nossos modelos estão em constante aprimoramento, com uma precisão que já atinge mais de 90% na identificação de objetos, dependendo da qualidade da imagem e das condições ambientais. Para a previsão, combinamos dados históricos, climáticos e sociais, oferecendo projeções robustas para auxiliar na alocação de recursos e ações preventivas. A validação em campo é um processo contínuo."
  },
  {
    question: "Os dados coletados são seguros e privados?",
    answer: "Sim, a segurança e a privacidade dos dados são prioridades absolutas. Adotamos protocolos rigorosos de criptografia e anonimização de informações sensíveis. Os dados são utilizados exclusivamente para o propósito de saúde pública e combate à dengue, em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD) e outras regulamentações internacionais."
  },
  {
    question: "É possível integrar o PreviDengue com sistemas de saúde existentes?",
    answer: "Absolutamente. Nosso sistema foi projetado com uma arquitetura modular e APIs robustas, facilitando a integração transparente com plataformas governamentais, sistemas de vigilância epidemiológica e softwares de gestão de saúde pública já em uso. Isso permite um fluxo de trabalho contínuo, aprimorando a capacidade de resposta das autoridades."
  },
  {
    question: "Como posso contribuir ou colaborar com o projeto?",
    answer: "Sua contribuição é muito bem-vinda! Se você tem experiência em inteligência artificial, desenvolvimento de software, saúde pública, design ou qualquer área relevante, convidamos você a entrar em contato conosco. Você pode explorar nosso repositório no GitHub para discussões técnicas, sugerir melhorias ou até mesmo se juntar à nossa equipe. Parcerias com instituições e órgãos governamentais também são encorajadas."
  },
  {
    question: "Qual o impacto esperado do PreviDengue nas comunidades?",
    answer: "Esperamos um impacto transformador. Ao identificar e mitigar focos de dengue de forma mais rápida e eficiente, o PreviDengue visa reduzir significativamente a incidência da doença, aliviar a sobrecarga nos sistemas de saúde, e, o mais importante, salvar vidas. Além disso, a plataforma busca educar e engajar a população, promovendo uma cultura de prevenção contínua."
  }
];

// --- Dados para a nova seção de Ferramentas ---
const toolCards = [
  {
    title: "Detecção de Focos",
    description: "Utilize nossa IA para identificar potenciais criadouros do mosquito Aedes aegypti em imagens.",
    icon: <Gauge size={32} />,
    link: "/detect"
  },
  {
    title: "Previsão de Surtos",
    description: "Acesse modelos preditivos para antecipar áreas de maior risco de dengue.",
    icon: <FlaskConical size={32} />,
    link: "/predict"
  },
  {
    title: "Dashboard Interativo",
    description: "Visualize dados e informações cruciais sobre a dengue em tempo real.",
    icon: <LayoutDashboard size={32} />,
    link: "/dashboard"
  },
  {
    title: "Jogo Educativo",
    description: "Aprenda sobre a prevenção da dengue de forma divertida e engajadora.",
    icon: <Gamepad2 size={32} />,
    link: "/game"
  },
  {
    title: "Campanhas de Conscientização",
    description: "Materiais e recursos para educar e mobilizar sua comunidade.",
    icon: <HeartHandshake size={32} />,
    link: "/conscientizacao"
  },
  {
    title: "Sobre o Projeto",
    description: "Conheça mais a fundo a nossa missão, visão e a equipe por trás do PreviDengue.",
    icon: <Lightbulb size={32} />,
    link: "/sobre"
  },
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
            PreviDengue: Linha de Frente no Combate à Dengue
          </h2>
          <p className="max-w-3xl text-zinc-200 text-lg sm:text-xl leading-relaxed animate-fade-in-up delay-200">
            Uma iniciativa de impacto social impulsionada pela inteligência artificial para proteger comunidades da ameaça da dengue através de detecção precoce, previsão e engajamento comunitário.
          </p>
          <div className="mt-8 animate-fade-in-up delay-300">
          <Link href="/#ferramentas" className="
              bg-gradient-to-r from-blue-600 to-green-600 /* Degradê fixo */
              text-white font-bold py-3 px-8 rounded-full text-lg
              shadow-lg /* Sombra para dar profundidade */
              transform -translate-y-1 /* Levemente elevado por padrão */
              transition-all duration-300 /* Mantém a transição caso queira reintroduzir algum efeito depois */
              block text-center /* Garante que o texto fique centralizado */
              ">
            Experimente as Ferramentas
          </Link>
        </div>

        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 2. Seção de Missão e Visão --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4">
          <h3 className="text-4xl font-bold text-white mb-12 text-center animate-fade-in-up">Nosso Propósito</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800 transform transition-all duration-300 hover:scale-[1.01] hover:border-blue-500 animate-fade-in-up">
              <div className="flex items-center justify-center bg-blue-600 w-16 h-16 rounded-full mb-6 mx-auto text-white">
                <Target size={32} />
              </div>
              <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4 text-center">Missão</h4>
              <p className="text-zinc-200 text-lg leading-relaxed text-center">
                Capacitar comunidades e órgãos de saúde com ferramentas inovadoras de inteligência artificial para detectar precocemente focos de dengue, prever surtos e engajar a população na prevenção, salvando vidas.
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800 transform transition-all duration-300 hover:scale-[1.01] hover:border-green-500 animate-fade-in-up delay-200">
              <div className="flex items-center justify-center bg-green-600 w-16 h-16 rounded-full mb-6 mx-auto text-white">
                <Lightbulb size={32} />
              </div>
              <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-4 text-center">Visão</h4>
              <p className="text-zinc-200 text-lg leading-relaxed text-center">
                Ser a plataforma líder em soluções de IA para o combate a doenças transmitidas por vetores, contribuindo para um futuro onde a dengue e outras ameaças similares sejam controladas de forma eficiente e sustentável globalmente.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 3. Seção Como Funciona --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4 text-center">
          <h3 className="text-4xl font-bold text-white mb-12 animate-fade-in-up">A Metodologia por Trás do PreviDengue</h3>
          <p className="text-zinc-200 text-lg mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Nossa abordagem integrada combina o poder da inteligência artificial com a ação comunitária para maximizar a eficácia no combate à dengue.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-zinc-900 p-8 rounded-xl shadow-xl border border-zinc-800 flex flex-col items-center group transform transition-all duration-300 hover:scale-[1.02] animate-fade-in-up delay-200">
              <div className="bg-blue-700 p-4 rounded-full mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <MapPin size={36} className="text-white" />
              </div>
              <h4 className="text-2xl font-semibold text-blue-300 mb-3">1. Detecção Inteligente</h4>
              <p className="text-zinc-200 leading-relaxed">
                Utilizamos visão computacional e redes neurais para analisar imagens de satélite e drones, identificando piscinas, caixas d'água e outros potenciais focos de dengue com alta precisão. Isso permite mapear áreas de risco de forma ágil e abrangente.
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-xl shadow-xl border border-zinc-800 flex flex-col items-center group transform transition-all duration-300 hover:scale-[1.02] animate-fade-in-up delay-300">
              <div className="bg-green-700 p-4 rounded-full mb-6 group-hover:bg-green-600 transition-colors duration-300">
                <Brain size={36} className="text-white" />
              </div>
              <h4 className="text-2xl font-semibold text-green-300 mb-3">2. Análise Preditiva</h4>
              <p className="text-zinc-200 leading-relaxed">
                Nossos modelos de Machine Learning processam dados históricos, climáticos e geográficos para prever o risco e a incidência de casos de dengue em diferentes regiões. Essa capacidade preditiva é crucial para a alocação eficiente de recursos e ações preventivas direcionadas.
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-xl shadow-xl border border-zinc-800 flex flex-col items-center group transform transition-all duration-300 hover:scale-[1.02] animate-fade-in-up delay-400">
              <div className="bg-purple-700 p-4 rounded-full mb-6 group-hover:bg-purple-600 transition-colors duration-300">
                <Megaphone size={36} className="text-white" />
              </div>
              <h4 className="text-2xl font-semibold text-purple-300 mb-3">3. Conscientização e Engajamento</h4>
              <p className="text-zinc-200 leading-relaxed">
                Transformamos dados complexos em informações acessíveis e interativas, como mapas de calor de risco e painéis de dados. Além disso, criamos materiais educativos para engajar a população na prevenção e combate diário à doença, promovendo a responsabilidade compartilhada.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 4. Seção de Gráficos de Previsão --- */}
        <section className="max-w-6xl mx-auto mb-24 p-6 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-8 text-center">Previsão de Casos de Dengue (Dados de Exemplo)</h3>
          <p className="text-zinc-200 text-lg mb-8 text-center max-w-2xl mx-auto">
            Acompanhe a evolução histórica de casos e a projeção futura, permitindo antecipar e planejar ações de combate.
          </p>

          <div className="mb-12">
            <h4 className="text-2xl font-semibold text-blue-400 mb-4 text-center">Casos Reais e Previsão de Dengue por Mês</h4>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={dengueCasesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#222', border: '1px solid #555', borderRadius: '4px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#888' }}
                />
                <Line type="monotone" dataKey="cases" stroke="#8884d8" name="Casos Reais" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="forecast" stroke="#FF0000" name="Previsão" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 5. Seção de Imagem de Destaque --- */}
        <section className="max-w-6xl mx-auto mb-24 px-4 text-center animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-10">Visualização Aérea e Identificação de Focos</h3>
          <p className="text-zinc-200 text-lg mb-12 max-w-2xl mx-auto">
            A tecnologia de visão computacional permite analisar vastas áreas, identificando com precisão potenciais criadouros. Veja um exemplo de como uma imagem aérea pode ser processada.
          </p>
          <div className="relative w-full h-96 rounded-xl overflow-hidden shadow-2xl border border-zinc-700">
            <Image
              src="https://picsum.photos/seed/dengue/1200/600" // Imagem de exemplo
              alt="Imagem aérea de foco de dengue"
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
              <span className="text-white text-2xl font-semibold">Análise de Potencial Foco</span>
            </div>
          </div>
          <p className="text-zinc-500 text-sm mt-4">
            *Imagem ilustrativa de uma possível área de análise.
          </p>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 7. Seção de Tabela de Impacto (Exemplo) --- */}
        <section className="max-w-4xl mx-auto mb-24 px-4 animate-fade-in-up">
          <h3 className="text-4xl font-bold text-white mb-10 text-center">Impacto Potencial e Métricas (Dados de Exemplo)</h3>
          <p className="text-zinc-200 text-lg mb-12 text-center max-w-2xl mx-auto">
            Visualizamos um futuro onde a detecção proativa e o engajamento reduzem significativamente a carga da dengue nas comunidades.
          </p>
          <div className="overflow-x-auto bg-zinc-900 rounded-xl shadow-lg border border-zinc-800">
            <table className="min-w-full text-left text-zinc-200">
              <thead className="bg-zinc-800 border-b border-zinc-700">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium text-blue-400">Métrica</th>
                  <th scope="col" className="px-6 py-4 font-medium text-green-400">Situação Atual (Estimativa)</th>
                  <th scope="col" className="px-6 py-4 font-medium text-purple-400">Cenário com PreviDengue (Meta)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-700 hover:bg-zinc-800 transition-colors">
                  <td className="px-6 py-4 font-medium">Redução de Casos</td>
                  <td className="px-6 py-4">0% (Sem intervenção IA)</td>
                  <td className="px-6 py-4">Até 30%</td>
                </tr>
                <tr className="border-b border-zinc-700 hover:bg-zinc-800 transition-colors">
                  <td className="px-6 py-4 font-medium">Tempo de Resposta a Focos</td>
                  <td className="px-6 py-4">72 horas</td>
                  <td className="px-6 py-4">24-48 horas</td>
                </tr>
                <tr className="border-b border-zinc-700 hover:bg-zinc-800 transition-colors">
                  <td className="px-6 py-4 font-medium">Área Mapeada por Dia</td>
                  <td className="px-6 py-4">5 km²</td>
                  <td className="px-6 py-4">20+ km²</td>
                </tr>
                <tr className="hover:bg-zinc-800 transition-colors">
                  <td className="px-6 py-4 font-medium">Engajamento Comunitário</td>
                  <td className="px-6 py-4">Baixo</td>
                  <td className="px-6 py-4">Alto</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-zinc-500 text-sm mt-4 text-center">
            *Os dados apresentados são exemplos e ilustram o impacto potencial do projeto.
          </p>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 8. Seção da Equipe --- */}
        <section className="max-w-5xl mx-auto mb-24 px-4 text-center">
          <h3 className="text-4xl font-bold text-white mb-12 animate-fade-in-up">Nossa Equipe</h3>
          <p className="text-zinc-200 text-lg mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Um time dedicado e apaixonado por tecnologia e impacto social, trabalhando juntos para construir um futuro mais seguro.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col items-center transform transition-all duration-300 hover:scale-[1.03] hover:border-blue-500 animate-fade-in-up"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <Image
                  src={member.avatar}
                  alt={`Foto de perfil de ${member.name}`}
                  width={120}
                  height={120}
                  className="rounded-full mx-auto mb-5 border-4 border-blue-600 shadow-lg"
                />
                <h4 className="text-white font-bold text-xl mb-1">{member.name}</h4>
                <p className="text-blue-300 text-md mb-3">{member.role}</p>
                <Link
                  href={`https://github.com/${member.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-blue-400 underline text-sm transition-colors duration-300"
                >
                  @{member.github}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 9. Nova Seção: Ferramentas do PreviDengue --- */}
        <section id="ferramentas" className="max-w-6xl mx-auto mb-24 px-4 text-center">
          <h3 className="text-4xl font-bold text-white mb-12 animate-fade-in-up">Explore as Ferramentas do PreviDengue</h3>
          <p className="text-zinc-200 text-lg mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Conheça as diversas funcionalidades que o PreviDengue oferece para auxiliar no controle e prevenção da dengue em sua comunidade.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {toolCards.map((card, index) => (
              <Link
                key={index}
                href={card.link}
                className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl transform transition-all duration-300 hover:scale-[1.03] hover:border-blue-600 group animate-fade-in-up"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="flex items-center justify-center bg-blue-700 w-14 h-14 rounded-full mb-6 mx-auto text-white group-hover:bg-blue-600 transition-colors duration-300">
                  {card.icon}
                </div>
                <h4 className="text-2xl font-semibold text-blue-300 mb-3">{card.title}</h4>
                <p className="text-zinc-200 leading-relaxed">{card.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <hr className="border-zinc-700 mb-24" />

        {/* --- 10. Seção de Perguntas Frequentes (FAQ) --- */}
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

      {/* --- Estilos de Animação (Pode mover para um global.css se preferir) --- */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }

        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}