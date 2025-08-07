"use client";

import React, { useRef } from "react"; 
// Supondo que você tenha componentes Header e Footer em @/components
import Header from "@/components/Header"; 
import Footer from "@/components/Footer"; 

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFullscreen = () => {
    if (iframeRef.current?.requestFullscreen) {
      iframeRef.current.requestFullscreen()
        .catch((err: Error) => {
          console.error(`Erro ao tentar maximizar a tela: ${err.message} (${err.name})`);
        });
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-4 sm:px-8 py-12">
      
      <Header />

      <main className="pt-20 sm:pt-28 flex flex-col items-center">
        <section className="text-center flex flex-col items-center justify-center gap-6 mb-8 w-full">
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tighter">Dengue Defense Grid</h1>
          <p className="max-w-3xl text-zinc-300 text-base sm:text-lg text-justify leading-relaxed">
            Assuma o comando da <strong>Dengue Defense Grid</strong>, uma iniciativa de alta tecnologia para proteger a comunidade contra a ameaça do <i>Aedes aegypti</i>. Neste jogo de estratégia e defesa de torre, sua missão é clara: posicionar defesas avançadas, gerenciar seus recursos e impedir que as ondas de mosquitos alcancem a base. Cada defesa que você posiciona é uma lição sobre o combate real à dengue. Prepare suas táticas, neutralize a ameaça e torne-se um herói da saúde pública. O futuro da comunidade está em suas mãos.
          </p>
        </section>

        <div className="w-full flex flex-col items-center gap-4">
          <iframe
            ref={iframeRef}
            // Certifique-se de que o caminho para o seu jogo está correto
            src="/game/index.html" 
            className="w-full h-[calc(100vh-400px)] sm:h-[calc(100vh-350px)] max-w-7xl border-4 border-zinc-700 rounded-md shadow-lg"
            allowFullScreen
            title="Dengue Defense Grid - Jogo de Estratégia"
          />

          <button 
            onClick={handleFullscreen}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Jogar em Tela Cheia
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
