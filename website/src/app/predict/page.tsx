// src/app/page.js
// ou a sua pasta de origem
"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChartSectionExample from "@/components/ChartSectionExample";
import StateChartSection from "@/components/StateChartSection";
// Removido o bloco de informações técnicas para focar na previsão

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-white pt-20 px-4 sm:px-8">
      <Header />

  <ChartSectionExample />
  <StateChartSection />

      <Footer />
    </main> 
  );
}