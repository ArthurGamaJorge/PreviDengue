"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MapSection from "@/components/MapSection";
import ChartSection from "@/components/ChartSection";
import { useState } from "react";

interface DataPoint {
  lat: number;
  lng: number;
  intensity: number;
  imageFilename: string | null;
  imageBase64: string;
  detectedObjects: Record<string, number>;
}

interface Municipality {
  codigo_ibge: number;
  nome: string;
  latitude: number;
  longitude: number;
  capital: number;
  codigo_uf: number;
  siafi_id: number;
  ddd: number;
  fuso_horario: string;
}

const CAMPINAS_DATA: Municipality = {
  codigo_ibge: 3509502,
  nome: "Campinas",
  latitude: -22.9056,
  longitude: -47.0608,
  capital: 0,
  codigo_uf: 35,
  siafi_id: 6735,
  ddd: 19,
  fuso_horario: "America/Sao_Paulo",
};

export default function Home() {
  const [mapDataPoints, setMapDataPoints] = useState<DataPoint[]>([]);
  const [selectedCity, setSelectedCity] = useState<Municipality>(CAMPINAS_DATA);

  return (
    <main className="min-h-screen bg-zinc-950 text-white pt-20 px-4 sm:px-8">
      <Header />
      <MapSection 
        dataPoints={mapDataPoints} 
        onDataChange={setMapDataPoints} 
        selectedCity={selectedCity} 
        onCityChange={setSelectedCity} 
      />
      <ChartSection 
        mapDataPoints={mapDataPoints} 
        municipalityIbgeCode={selectedCity.codigo_ibge} 
      />
      <Footer />
    </main>
  );
}