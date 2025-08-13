// components/Header.tsx
import Link from "next/link";
import Image from "next/image"; // Importar o componente Image

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 bg-opacity-90 backdrop-blur-sm shadow-md flex justify-between items-center px-8 py-4 text-white">
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <Image 
          src="/favicon.ico" // Substitua pelo caminho do seu ícone
          alt="Logo PreviDengue"
          width={32}
          height={32}
        />
        <h1 className="text-3xl font-bold tracking-tight">PreviDengue</h1>
      </Link>
      <nav className="flex gap-8 text-base font-medium">
        <Link href="/" className="hover:underline">
          Home
        </Link>

        <Link href="/#ferramentas" className="hover:underline">
          Testar Ferramentas
        </Link>

        <Link href="/sobre" className="hover:underline">
          Sobre o Projeto
        </Link>
      </nav>
    </header>
  );
}