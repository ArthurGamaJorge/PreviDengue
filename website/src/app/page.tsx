"use client";

import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black via-zinc-900 to-zinc-800 text-white px-8 py-12 scroll-smooth">
      <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 bg-opacity-90 backdrop-blur-sm shadow-md flex justify-between items-center px-8 py-4 text-white">
        <h1 className="text-2xl font-bold tracking-tight">Undengue-Vision</h1>
        <nav className="flex gap-8 text-sm font-medium">
          <a href="#" className="hover:underline">Home</a>
          <a href="#sobre" className="hover:underline">Sobre</a>
          <a href="#testar" className="hover:underline">Testar</a>
          <a href="#mais" className="hover:underline">Mais</a>
        </nav>
      </header>

      <main className="pt-28">
        <section className="text-center flex flex-col items-center justify-center gap-6 mb-32">
          <span className="bg-zinc-800 px-4 py-1 rounded-full text-xs uppercase tracking-widest text-zinc-400">
            YOLO AI
          </span>
          <h2 className="text-5xl sm:text-6xl font-bold leading-tight">
            Detecte 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400"> focos de dengue</span> com IA
          </h2>
          <p className="max-w-xl text-zinc-300 text-base sm:text-lg">
            Um projeto de inteligência artificial para auxiliar na identificação de possíveis criadouros do mosquito da dengue.
          </p>

          <button className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-blue-400 to-green-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
            <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
              Testar
            </span>
          </button>
        </section>

        <hr className="border-zinc-700 mb-32" />

        <section id="sobre" className="max-w-4xl mx-auto text-center mb-32">
          <h3 className="text-3xl font-bold mb-6 text-white">Sobre o Projeto</h3>
          <p className="text-zinc-300 mb-6">
            Nosso projeto usa inteligência artificial para identificar criadouros do mosquito da dengue a partir de imagens. A detecção é feita com a tecnologia YOLO (You Only Look Once), com foco em caixas d'água, carros e piscinas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl overflow-hidden">
              <Image src="http://picsum.photos/1000?1" alt="Ilustração 1" width={1000} height={600} className="w-full h-auto object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden">
              <Image src="http://picsum.photos/1000?2" alt="Ilustração 2" width={1000} height={600} className="w-full h-auto object-cover" />
            </div>
          </div>
        </section>

        <hr className="border-zinc-700 mb-32" />

        <section id="contato" className="max-w-3xl mx-auto text-center mb-32">
          <h3 className="text-3xl font-bold mb-4">Contato</h3>
          <p className="text-zinc-300">
            Fale com a equipe através do e-mail <a href="mailto:undenguevision@projeto.com" className="underline">undenguevision@projeto.com</a> ou redes sociais.
          </p>
        </section>
      </main>

      <footer className="bg-zinc-900 text-zinc-400 text-center py-6 mt-12 border-t border-zinc-700">
        <p>&copy; 2025 Undengue-Vision. Todos os direitos reservados.</p>
        <p className="text-xs mt-2">Com 💙 por uma cidade mais saudável</p>
      </footer>
    </div>
  );
}
