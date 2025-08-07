"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MapSection from "@/components/MapSection";
import ChartSection from "@/components/ChartSection";

export default function Home() {

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-white pt-20 px-4 sm:px-8">
      <Header />
      
      <MapSection />
      
      <ChartSection />
      
      <Footer />
    </main>
  );
}