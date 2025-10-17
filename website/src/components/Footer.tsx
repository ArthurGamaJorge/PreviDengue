// components/Footer.tsx
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function Footer() {
  const [copiedEmail, setCopiedEmail] = useState('');

  const contactEmails = [
    'previdengue@gmail.com',
    'arthurgamajorge@gmail.com',
    'danieldorigancampos@gmail.com',
    'ionmateusoprea@gmail.com',
  ];

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => {
      setCopiedEmail('');
    }, 2000);
  };

  return (
    <footer className="relative w-full mt-12 text-zinc-300">
      {/* Full-bleed background spanning the viewport width */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800"
      />
      {/* Content */}
      <div className="relative container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">

          {/* Coluna 1: Informações do Projeto */}
          <div className="text-left">
            <h3 className="text-white font-bold text-lg mb-4">Sobre o Projeto</h3>
            <p className="text-zinc-400 leading-relaxed">
              PreviDengue é uma ferramenta de IA que combina a detecção de criadouros com a previsão de casos, auxiliando no combate à dengue.
            </p>
          </div>

          {/* Coluna 2: Links Rápidos */}
          <div className="md:border-l md:border-zinc-700 md:pl-8 text-left">
            <h3 className="text-white font-bold text-lg mb-4">Links Rápidos</h3>
            <ul>
              <li className="mb-2">
                <Link href="/" className="hover:text-white transition-colors">
                  Início
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/sobre" className="hover:text-white transition-colors">
                  Sobre o Projeto
                </Link>
              </li>
              <li className="mb-2">
                <a href="/dashboard" className="hover:text-white transition-colors">
                  Painel de Análise
                </a>
              </li>
              <li className="mb-2">
                <Link href="/detect" className="hover:text-white transition-colors">
                  IA de Detecção
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/predict" className="hover:text-white transition-colors">
                  IA de Previsão
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Contato */}
          <div className="md:border-l md:border-zinc-700 md:pl-8 text-left">
            <h3 className="text-white font-bold text-lg mb-4">Contato</h3>
            <div className="flex flex-col gap-2">
              {contactEmails.map((email) => (
                <div key={email} className="flex items-center gap-2">
                  <span className="text-zinc-400">
                    {email}
                  </span>
                  <button
                    onClick={() => handleCopyEmail(email)}
                    className="p-1 rounded-full hover:bg-zinc-700 transition-colors"
                    title="Copiar e-mail"
                  >
                    {copiedEmail === email ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-zinc-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 4: Outros */}
          <div className="md:border-l md:border-zinc-700 md:pl-8 text-left">
            <h3 className="text-white font-bold text-lg mb-4">Outros</h3>
            <a href="https://github.com/ionmateus/tcc" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white underline transition-colors mb-2 flex items-center gap-2">
              {/* Ícone do GitHub */}
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.465-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.046.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.771.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.61.8.577 4.766-1.586 8.205-6.084 8.205-11.387c0-6.627-5.373-12-12-12z"/></svg>
              GitHub do Projeto
            </a>
            <a href="https://huggingface.co/previdengue/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white underline transition-colors mb-2 flex items-center gap-2">
              {/* Ícone do Hugging Face - PNG */}
              <svg height="1.8em" width="1.8em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.25 11.535c0-3.407 1.847-6.554 4.844-8.258a9.822 9.822 0 019.687 0c2.997 1.704 4.844 4.851 4.844 8.258 0 5.266-4.337 9.535-9.687 9.535S2.25 16.8 2.25 11.535z" fill="#FF9D0B"></path><path d="M11.938 20.086c4.797 0 8.687-3.829 8.687-8.551 0-4.722-3.89-8.55-8.687-8.55-4.798 0-8.688 3.828-8.688 8.55 0 4.722 3.89 8.55 8.688 8.55z" fill="#FFD21E"></path><path d="M11.875 15.113c2.457 0 3.25-2.156 3.25-3.263 0-.576-.393-.394-1.023-.089-.582.283-1.365.675-2.224.675-1.798 0-3.25-1.693-3.25-.586 0 1.107.79 3.263 3.25 3.263h-.003z" fill="#FF323D"></path><path d="M14.76 9.21c.32.108.445.753.767.585.447-.233.707-.708.659-1.204a1.235 1.235 0 00-.879-1.059 1.262 1.262 0 00-1.33.394c-.322.384-.377.92-.14 1.36.153.283.638-.177.925-.079l-.002.003zm-5.887 0c-.32.108-.448.753-.768.585a1.226 1.226 0 01-.658-1.204c.048-.495.395-.913.878-1.059a1.262 1.262 0 011.33.394c.322.384.377.92.14 1.36-.152.283-.64-.177-.925-.079l.003.003zm1.12 5.34a2.166 2.166 0 011.325-1.106c.07-.02.144.06.219.171l.192.306c.069.1.139.175.209.175.074 0 .15-.074.223-.172l.205-.302c.08-.11.157-.188.234-.165.537.168.986.536 1.25 1.026.932-.724 1.275-1.905 1.275-2.633 0-.508-.306-.426-.81-.19l-.616.296c-.52.24-1.148.48-1.824.48-.676 0-1.302-.24-1.823-.48l-.589-.283c-.52-.248-.838-.342-.838.177 0 .703.32 1.831 1.187 2.56l.18.14z" fill="#3A3B45"></path><path d="M17.812 10.366a.806.806 0 00.813-.8c0-.441-.364-.8-.813-.8a.806.806 0 00-.812.8c0 .442.364.8.812.8zm-11.624 0a.806.806 0 00.812-.8c0-.441-.364-.8-.812-.8a.806.806 0 00-.813.8c0 .442.364.8.813.8zM4.515 13.073c-.405 0-.765.162-1.017.46a1.455 1.455 0 00-.333.925 1.801 1.801 0 00-.485-.074c-.387 0-.737.146-.985.409a1.41 1.41 0 00-.2 1.722 1.302 1.302 0 00-.447.694c-.06.222-.12.69.2 1.166a1.267 1.267 0 00-.093 1.236c.238.533.81.958 1.89 1.405l.24.096c.768.3 1.473.492 1.478.494.89.243 1.808.375 2.732.394 1.465 0 2.513-.443 3.115-1.314.93-1.342.842-2.575-.274-3.763l-.151-.154c-.692-.684-1.155-1.69-1.25-1.912-.195-.655-.71-1.383-1.562-1.383-.46.007-.889.233-1.15.605-.25-.31-.495-.553-.715-.694a1.87 1.87 0 00-.993-.312zm14.97 0c.405 0 .767.162 1.017.46.216.262.333.588.333.925.158-.047.322-.071.487-.074.388 0 .738.146.985.409a1.41 1.41 0 01.2 1.722c.22.178.377.422.445.694.06.222.12.69-.2 1.166.244.37.279.836.093 1.236-.238.533-.81.958-1.889 1.405l-.239.096c-.77.3-1.475.492-1.48.494-.89.243-1.808.375-2.732.394-1.465 0-2.513-.443-3.115-1.314-.93-1.342-.842-2.575.274-3.763l.151-.154c.695-.684 1.157-1.69 1.252-1.912.195-.655.708-1.383 1.56-1.383.46.007.889.233 1.15.605.25-.31.495-.553.718-.694.244-.162.523-.265.814-.3l.176-.012z" fill="#FF9D0B"></path><path d="M9.785 20.132c.688-.994.638-1.74-.305-2.667-.945-.928-1.495-2.288-1.495-2.288s-.205-.788-.672-.714c-.468.074-.81 1.25.17 1.971.977.721-.195 1.21-.573.534-.375-.677-1.405-2.416-1.94-2.751-.532-.332-.907-.148-.782.541.125.687 2.357 2.35 2.14 2.707-.218.362-.983-.42-.983-.42S2.953 14.9 2.43 15.46c-.52.558.398 1.026 1.7 1.803 1.308.778 1.41.985 1.225 1.28-.187.295-3.07-2.1-3.34-1.083-.27 1.011 2.943 1.304 2.745 2.006-.2.7-2.265-1.324-2.685-.537-.425.79 2.913 1.718 2.94 1.725 1.075.276 3.813.859 4.77-.522zm4.432 0c-.687-.994-.64-1.74.305-2.667.943-.928 1.493-2.288 1.493-2.288s.205-.788.675-.714c.465.074.807 1.25-.17 1.971-.98.721.195 1.21.57.534.377-.677 1.407-2.416 1.94-2.751.532-.332.91-.148.782.541-.125.687-2.355 2.35-2.137 2.707.215.362.98-.42.98-.42S21.05 14.9 21.57 15.46c.52.558-.395 1.026-1.7 1.803-1.308.778-1.408.985-1.225 1.28.187.295 3.07-2.1 3.34-1.083-.27 1.011-2.94 1.304-2.743 2.006.2.7 2.263-1.324 2.685-.537.423.79-2.912 1.718-2.94 1.725-1.077.276-3.815.859-4.77-.522z" fill="#FFD21E"></path></svg>
              Hugging Face
            </a>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} PreviDengue. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}