"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-8 py-12">
      <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 bg-opacity-90 backdrop-blur-sm shadow-md flex justify-between items-center px-8 py-4 text-white">
        <h1 className="text-3xl font-bold tracking-tight">Undengue-Vision</h1>
        <nav className="flex gap-8 text-base font-medium">
          <a href="" className="hover:underline text-blue-400">Home</a>
          <a href="./sobre" className="hover:underline">Sobre o projeto</a>
          <a href="./sobre" className="hover:underline">Previsão</a>
          <a href="./sobre" className="hover:underline">Conscientização</a>
          <a href="./sobre" className="hover:underline">Detecção</a>
          <a href="./sobre" className="hover:underline">Futuro</a>
        </nav>
      </header>

      <main className="pt-28">
        <section className="text-center flex flex-col items-center justify-center gap-6 mb-32">
          
          <h2 className="text-5xl sm:text-6xl font-bold leading-tight">
            Detecte
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400"> focos de dengue</span> com IA
          </h2>
          <p className="max-w-xl text-zinc-300 text-base sm:text-lg">
            Um projeto de inteligência artificial para auxiliar na identificação de possíveis criadouros do mosquito da dengue.
          </p>

          <a href="/detect">
            <button className="cursor-pointer text-lg relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-blue-400 to-green-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
              <span className="relative px-6 py-3 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                Testar
              </span>
            </button>
          </a>

        </section>

        
        <hr className="border-zinc-700 mb-32" />

        <section id="ferramentas" className="max-w-6xl mx-auto text-center mb-32 px-4">
  <h3 className="text-3xl font-bold mb-12 text-white">Ferramentas do Sistema</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">

    {[
      {
        href: "/dashboard",
        title: "Dashboard",
        description: "Detecte e acompanhe focos de dengue em tempo real.",
        color: "text-purple-300",
        image: "https://s1.ppllstatics.com/lasprovincias/www/multimedia/2024/07/18/calor-ola-kn4C-U220752169970dsC-1200x840@Las%20Provincias.JPG"
      },
      {
        href: "/predict",
        title: "Previsão",
        description: "Gráficos com previsões baseadas em dados históricos.",
        color: "text-yellow-300",
        image: "https://buzzmonitor.com.br/wp-content/uploads/from-pyro-cms/graficos-bm-editada.jpg"
      },
      {
        href: "/conscientizacao",
        title: "Conscientização",
        description: "Educação e prevenção contra a dengue.",
        color: "text-red-300",
        image: "https://www.qualicorp.com.br/wp-content/uploads/2024/01/1200x580_QUALIBLOG_Felicidade_Trabalho-1024x495.jpg"
      },
      {
        href: "/futuro",
        title: "Futuro do Projeto",
        description: "Sustentabilidade e próximos passos da plataforma.",
        color: "text-green-300",
        image: "https://mundogeo.com/wp-content/uploads/2024/03/04145437/Agricultura-5.0-como-os-Drones-est%C3%A3o-moldando-o-futuro-do-setor.jpg"
      },
      {
        href: "/sobre",
        title: "Sobre o Projeto",
        description: "Tecnologia, desenvolvimento e arquitetura do sistema.",
        color: "text-blue-300",
        image: "https://blog.portalpos.com.br/wp-content/uploads/2024/05/como-fazer-um-bom-relatorio.jpg"
      },
    ].map((tool, index) => (
      <a
        key={index}
        href={tool.href}
        className="relative overflow-hidden rounded-2xl shadow-lg border border-zinc-800 hover:scale-[1.02] transition transform h-60 flex items-end"
      >
        {/* Imagem de fundo com gradiente escurecido */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(0,0,0), rgba(0,0,0,0.2)), url('${tool.image}')`,
          }}
        ></div>

        {/* Conteúdo */}
        <div className="relative z-10 p-5 text-left">
          <h4 className={`text-xl font-bold mb-2 ${tool.color}`}>{tool.title}</h4>
          <p className="text-zinc-100 text-sm">{tool.description}</p>
        </div>
      </a>
    ))}

  </div>
</section>


        <hr className="border-zinc-700 mb-32" />

        <section id="sobre" className="max-w-4xl mx-auto text-center mb-32">
          <h3 className="text-3xl font-bold mb-6 text-white">Sobre o Projeto</h3>
          <p className="text-zinc-300 mb-6">
            Nosso projeto usa inteligência artificial para identificar criadouros do mosquito da dengue a partir de imagens. A detecção é feita com a tecnologia YOLO (You Only Look Once), com foco em caixas d'água, carros e piscinas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
            <div className="rounded-2xl overflow-hidden">
              <img src="/images/img-4.png" alt="Ilustração 1" width={1000} height={600} className="w-full h-auto object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden">
              <img src="/images/detected1.png" alt="Ilustração 1" width={1000} height={600} className="w-full h-auto object-cover" />
            </div>
          </div>
          <div id="mais" className="bg-zinc-800 bg-opacity-40 p-8 rounded-xl">
            <h4 className="text-2xl font-semibold mb-4">Aspectos Técnicos</h4>
            <p className="text-zinc-400 mb-4">O modelo YOLO foi treinado com mais de 250 imagens rotuladas manualmente, transformadas em 1500+ imagens augmentadas. Abaixo, mostramos uma amostra das estatísticas de detecção:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-zinc-900 p-4 rounded-lg shadow">
                <h5 className="text-lg font-bold mb-1">Precisão</h5>
                <p className="text-green-400 text-2xl font-mono">0.0%</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-lg shadow">
                <h5 className="text-lg font-bold mb-1">Recall</h5>
                <p className="text-blue-400 text-2xl font-mono">0.0%</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-lg shadow">
                <h5 className="text-lg font-bold mb-1">F1 Score</h5>
                <p className="text-yellow-400 text-2xl font-mono">0.0%</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-zinc-700 mb-32" />

        <section id="contato" className="max-w-5xl mx-auto text-center mb-32">
          <h3 className="text-3xl font-bold mb-8">Contato</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl">
              <Image src="https://avatars.githubusercontent.com/u/129080603?v=4" alt="Perfil 1" width={100} height={100} className="rounded-full mx-auto mb-4" />
              <h4 className="text-white font-semibold">Arthur Gama Jorge</h4>
              <a href="https://github.com/arthurgamajorge" target="_blank" className="text-blue-400 underline">@arthurgamajorge</a>
            </div>
            <div className="p-4 rounded-xl">
              <Image src="https://avatars.githubusercontent.com/u/129087589?v=4" alt="Perfil 2" width={100} height={100} className="rounded-full mx-auto mb-4" />
              <h4 className="text-white font-semibold">Daniel Dorigan de Carvalho Campos</h4>
              <a href="https://github.com/DanielDoriganCC" target="_blank" className="text-blue-400 underline">@DanielDoriganCC</a>
            </div>
            <div className="p-4 rounded-xl">
              <Image src="https://avatars.githubusercontent.com/u/90868424?v=4" alt="Perfil 3" width={100} height={100} className="rounded-full mx-auto mb-4" />
              <h4 className="text-white font-semibold">Ion Mateus Nunes Oprea</h4>
              <a href="https://github.com/ionmateus" target="_blank" className="text-blue-400 underline">@ionmateus</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-zinc-900 text-zinc-400 text-center py-6 mt-12 border-t border-zinc-700">
        <a href="https://github.com/ionmateus/tcc" target="_blank" className="underline hover:text-white">GitHub do Projeto</a>
      </footer>
    </div>
  );
}