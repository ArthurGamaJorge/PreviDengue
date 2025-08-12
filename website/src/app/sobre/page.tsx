"use client";

import React, { useState } from "react";
import Header from "@/components/Header"; 
import Footer from "@/components/Footer"; 

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
  { id: "previsao:solucao", title: "A solução e impacto" },
  { id: "previsao:ia", title: "Desenvolvimento da IA" },
  { id: "previsao:resultados", title: "Resultados" },
  { id: "divider:conscientizacao", title: "Frente de Conscientização*" },
  { id: "conscientizacao:problema", title: "O problema" },
  { id: "conscientizacao:solucao", title: "A solução e impacto" },
  { id: "divider:conclusao", title: "Conclusão*" },
  { id: "conclusao:consideracoes", title: "Considerações finais" },
  { id: "conclusao:referencias", title: "Referências bibliográficas" },
];

const contentMap: { [key: string]: string } = {
  "intro:quem-somos": "Conteúdo explicando o que é o projeto.",
  "identificacao:problema": "Problema identificado na frente de identificação.",
  "previsao:problema": "Problema identificado na frente de previsão.",
  "conscientizacao:problema": "Problema identificado na frente de conscientização.",
  // Add more as needed...
};

export default function Home() {
  const [selectedId, setSelectedId] = useState("intro:quem-somos");

  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-8 py-12">
      
      <Header></Header>

      <main className="pt-20 flex flex-col items-start">
        <h2 className="text-4xl font-bold mb-8 pl-6 text-left">Sobre o projeto</h2>

        <div className="flex w-full">
          {/* Sidebar List */}
          <ul className="w-64 flex-shrink-0 space-y-2 text-left pl-6 pr-2 max-h-[70vh] overflow-y-auto scroll-left-invisible">
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

          {/* Right-side content */}
          <div className="flex-1 ml-12 pr-6">
            <div className="text-lg leading-relaxed">
              {contentMap[selectedId] || "Conteúdo em desenvolvimento..."}
            </div>
          </div>
        </div>
      </main>

      <Footer></Footer>
    </div>
  );
}
