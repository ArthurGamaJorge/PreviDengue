// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-400 py-10 border-t border-zinc-700 w-full mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          {/* Coluna 1: Informações do Projeto */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Sobre o Projeto</h3>
            <p className="text-zinc-500 leading-relaxed">
              Este projeto é uma ferramenta de análise inteligente de focos, desenvolvida para auxiliar no monitoramento e prevenção de doenças transmitidas por vetores.
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Links Rápidos</h3>
            <ul>
              <li className="mb-2">
                <Link href="/" className="hover:text-white transition-colors">
                  Início
                </Link>
              </li>
              <li className="mb-2">
                <a href="/dashboard" className="hover:text-white transition-colors">
                  Ver Mapa
                </a>
              </li>
              <li className="mb-2">
                <Link href="/sobre" className="hover:text-white transition-colors">
                  Sobre nós
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Contato */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contato</h3>
            <p className="text-zinc-500">
              E-mail: previdengue@gmail.com
            </p>
          </div>

          {/* Coluna 4: Redes Sociais e Código */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Outros</h3>
           
            <a href="https://github.com/ionmateus/tcc" target="_blank" className="hover:text-white underline transition-colors">
              <span className="flex items-center gap-2">
                {/* Ícone do GitHub */}
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.465-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.046.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.771.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.61.8.577 4.766-1.586 8.205-6.084 8.205-11.387c0-6.627-5.373-12-12-12z"/></svg>
                GitHub do Projeto
              </span>
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-700 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} PreviDengue. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}