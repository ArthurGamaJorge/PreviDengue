"use client";

import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-8 py-12">
      <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 bg-opacity-90 backdrop-blur-sm shadow-md flex justify-between items-center px-8 py-4 text-white">
        <a href="../">
          <h1 className="text-3xl font-bold tracking-tight">Undengue-Vision</h1>
        </a>
        <nav className="flex gap-8 text-base font-medium">
          <a href="../" className="hover:underline">Home</a>
          <a href="" className="hover:underline">Sobre</a>
          <a href="" className="hover:underline">Testar</a>
        </nav>
      </header>

      <main className="pt-28 flex flex-col items-center">
        <h2 className="text-4xl font-bold mb-8">Conscientização</h2>
      </main>

    </div>
  );
}