"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// O CSS é importado aqui.
import "./markdown-styles.css";

// Mapeamento dos IDs para os nomes dos arquivos HTML
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
  { id: "intro:quem-somos", title: "Quem somos?" },
  { id: "o-que-e", title: "O que é?" },
  { id: "divider:identificacao", title: "Frente de Identificação*" },
  { id: "identificacao:problema", title: "O problema" },
  { id: "identificacao:solucao", title: "A solução e impacto" },
  { id: "identificacao:ia", title: "Desenvolvimento da IA" },
  { id: "identificacao:resultados", title: "Resultados" },
  { id: "divider:previsao", title: "Frente de Previsão*" },
  { id: "previsao:problema", title: "O problema" },
  { id: "previsao:solucao", "title": "A solução e impacto" },
  { id: "previsao:ia", title: "Desenvolvimento da IA" },
  { id: "previsao:resultados", title: "Resultados" },
  { id: "divider:conscientizacao", title: "Frente de Conscientização*" },
  { id: "conscientizacao:problema", title: "O problema" },
  { id: "conscientizacao:solucao", title: "A solução e impacto" },
  { id: "divider:conclusao", title: "Conclusão*" },
  { id: "conclusao:consideracoes", title: "Considerações finais" },
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
          console.error("Failed to fetch content:", error);
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
      <main className="pt-20 flex flex-col items-start">
        <h2 className="text-4xl font-bold mb-8 pl-6 text-left">Sobre o projeto</h2>
        {/* Este div agora tem uma altura fixa e overflow escondido para evitar rolagem da página */}
        <div className="flex w-full h-[calc(100vh-250px)] overflow-hidden">
          {/* Sidebar List agora tem altura total e rolagem própria */}
          <ul className="w-64 flex-shrink-0 space-y-2 text-left pl-6 pr-2 h-full overflow-y-auto scroll-left-invisible">
            {sections.map((item) => {
              const isDivider = item.title.endsWith("*");
              return (
                <li
                  key={item.id}
                  className={`
                    px-3 py-2 rounded cursor-pointer
                    ${isDivider ? "text-zinc-400 font-semibold uppercase text-sm" : ""}
                    ${
                      selectedId === item.id && !isDivider
                        ? "bg-zinc-700 text-white"
                        : !isDivider
                        ? "hover:bg-zinc-800"
                        : ""
                    }
                  `}
                  onClick={() => {
                    if (!isDivider) setSelectedId(item.id);
                  }}
                >
                  {item.title.replace("*", "")}
                </li>
              );
            })}
          </ul>
          {/* A área de conteúdo agora tem altura total e rolagem própria */}
          <div className="flex-1 ml-12 pr-6 h-full overflow-y-auto">
            <div
              className="text-lg leading-relaxed markdown-content"
              dangerouslySetInnerHTML={{ __html: content }}
            ></div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
