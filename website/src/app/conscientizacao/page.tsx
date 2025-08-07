"use client";

import React from "react";
import Header from "@/components/Header"; 
import Footer from "@/components/Footer"; 

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-[radial-gradient(ellipse_at_top,_#0b0b0b_0%,_#111111_40%,_#1a1a1a_70%,_#0f1115_100%)] text-white px-8 py-12">
      
      <Header></Header>

      <main className="pt-28 flex flex-col items-center">
        <h2 className="text-4xl font-bold mb-8">Conscientização</h2>
      </main>

      <Footer></Footer>

    </div>
  );
}