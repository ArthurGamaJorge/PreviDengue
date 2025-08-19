// components/Header.tsx
import Link from "next/link";
import Image from "next/image";
import { Gauge, Info, House } from 'lucide-react'; // Importar ícones

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 flex justify-between items-center px-8 py-4 text-white">
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <Image 
          src="/favicon.ico" 
          alt="Logo PreviDengue"
          width={32}
          height={32}
        />
        <h1 className="text-3xl font-bold tracking-tight text-white">PreviDengue</h1>
      </Link>

      {/* Navegação */}
      <nav className="flex gap-4 sm:gap-8 text-base font-medium">
        <Link 
          href="/" 
          className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-zinc-800 hover:text-white"
        >
          <House size={20} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
          <span className="hidden sm:inline-block text-zinc-300 group-hover:text-white transition-colors">
            Início
          </span>
        </Link>

        <Link 
          href="/dashboard" 
          className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-zinc-800 hover:text-white"
        >
          <Gauge size={20} className="text-zinc-400 group-hover:text-green-400 transition-colors" />
          <span className="hidden sm:inline-block text-zinc-300 group-hover:text-white transition-colors">
            Painel de Análise
          </span>
        </Link>
        
        <Link 
          href="/sobre" 
          className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-zinc-800 hover:text-white"
        >
          <Info size={20} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
          <span className="hidden sm:inline-block text-zinc-300 group-hover:text-white transition-colors">
            Sobre o Projeto
          </span>
        </Link>
      </nav>
    </header>
  );
}
