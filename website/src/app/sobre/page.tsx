"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// O CSS é importado aqui.
import "./markdown-styles.css";

// Mapeamento dos IDs para os nomes dos arquivos HTML.
const contentMap = {
  "intro:quem-somos": "introducao-quem-somos.html",
  "o-que-e": "o-que-e.html",
  "identificacao:problema": "identificacao-problema.html",
  "identificacao:solucao": "identificacao-solucao.html",
  "identificacao:ia": "identificacao-ia.html",
  "identificacao:resultados": "identificacao-resultados.html",
  "previsao:problema": "previsao-problema.html",
  "previsao:solucao": "previsao-solucao.html",
  "previsao:ia": "previsao-ia.html",
  "previsao:resultados": "previsao-resultados.html",
  "conscientizacao:problema": "conscientizacao-problema.html",
  "conscientizacao:solucao": "conscientizacao-solucao.html",
  "conclusao:consideracoes": "conclusao-consideracoes.html",
  "conclusao:referencias": "conclusao-referencias.html",
};

const sections = [
  { id: "intro:quem-somos", title: "Introdução" },
  { id: "o-que-e", title: "O que é o PreviDengue?" },
  { id: "identificacao:problema", title: "A dengue" },
  { id: "identificacao:solucao", title: "IA no combate à dengue" },
  { id: "identificacao:ia", title: "Planejamento inicial" },
  { id: "identificacao:resultados", title: "Detecção de criadouros" },
  { id: "previsao:problema", title: "Previsão de casos" },
  { id: "previsao:solucao", title: "Construção do website" },
  { id: "previsao:ia", title: "Desempenho das ferramentas" },
  { id: "previsao:resultados", title: "Limitações e desafios" },
  { id: "conscientizacao:problema", title: "Conclusão e perspectivas" },
  { id: "conclusao:referencias", title: "Referências bibliográficas" },
];

export default function Home() {
  const [selectedId, setSelectedId] = useState("intro:quem-somos");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      setIsLoading(true);
      const fileName = contentMap[selectedId];
      if (fileName) {
        try {
          const response = await fetch(`/content/${fileName}`);
          const text = await response.text();
          setContent(text);
        } catch (error) {
          console.error("Falha ao buscar o conteúdo:", error);
          setContent("Conteúdo não encontrado.");
        }
      } else {
        setContent("Conteúdo em desenvolvimento...");
      }
      setIsLoading(false);
    }

    fetchContent();
  }, [selectedId]);

  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-8 py-12">
      
      <Header />
  
      <main className="pt-20 flex w-full">
        {/* Este div agora envolve o título e o menu lateral, tornando toda a seção esquerda fixa */}
        <div className="w-64 flex-shrink-0 space-y-4 text-left pl-6 pr-2 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
          <h2 className="text-4xl font-bold text-left">Sobre o projeto</h2>
          <ul className="space-y-2">
            {sections.map((item) => (
              <li
                key={item.id}
                className={`
                  px-3 py-2 rounded cursor-pointer
                  ${
                    selectedId === item.id
                      ? "bg-zinc-700 text-white"
                      : "hover:bg-zinc-800"
                  }
                `}
                onClick={() => setSelectedId(item.id)}
              >
                {item.title}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex-1 ml-12 pr-6">
          <div
            className="text-lg leading-relaxed markdown-content"
            dangerouslySetInnerHTML={{ __html: content }}
          ></div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
