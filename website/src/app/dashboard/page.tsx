"use client";

import dynamic from "next/dynamic";
import { useState, ChangeEvent } from "react";
import Header from "@/components/Header";
import KPIs from "@/components/KPIs";
import IntensityForm from "@/components/IntensityForm";
import Footer from "@/components/Footer";

const DynamicMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
});

interface DataPoint {
  lat: number;
  lng: number;
  intensity: number;
  imageFilename: string | null;
  imageBase64: string;
  detectedObjects: Record<string, number>; // Ex: { carro: 2, piscina: 1 }
}

export default function Home() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(
    null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);

  const uploadImageAndGetDetection = async (
    file: File
  ): Promise<{ base64: string; intensity: number }> => {
    const formData = new FormData();
    formData.append("file", file);

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject("Erro ao ler imagem");
      reader.readAsDataURL(file);
    });

    const res = await fetch("http://localhost:8000/detect/", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Erro ao enviar imagem para o backend");

    const data = await res.json();
    const intensity = calculateIntensityFromCounts(data.contagem ?? {});
    console.log(data);
    return {
      base64,
      intensity,
    };
  };

  const calculateIntensityFromCounts = (
    counts: Record<string, number>
  ): number => {
    const weights: Record<string, number> = {
      carro: 0.5,
      piscina: 2,
      caixa_agua: 3,
    };

    let score = 0;
    for (const key in counts) {
      score += (weights[key] || 0) * counts[key];
    }

    return Math.min(10, parseFloat(score.toFixed(2))); // normaliza entre 0 e 10
  };

  const handleMapClick = (e: [number, number]) => setSelectedCoords(e);

    const handleRemovePoint = (index: number) => {
    setDataPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPoint = async () => {
    if (!selectedCoords || !imageFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject("Erro ao ler imagem");
        reader.readAsDataURL(imageFile);
      });

      const res = await fetch("http://localhost:8000/detect/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Erro no backend");

      const data = await res.json(); // Ex: { intensity_score: 6.4, counts: { carro: 2, piscina: 1 } }

      const newPoint: DataPoint = {
        lat: selectedCoords[0],
        lng: selectedCoords[1],
        intensity: calculateIntensityFromCounts(data.contagem ?? {}),
        imageFilename: imageFile.name,
        imageBase64: base64,
        detectedObjects: data.contagem ?? {},
      };

      setDataPoints((prev) => [...prev, newPoint]);

      setSelectedCoords(null);
      setImageFile(null);
    } catch (err) {
      alert("Erro ao processar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleExportJson = () => {
  const exportData = dataPoints.map(
    ({ lat, lng, intensity, imageFilename, detectedObjects }) => ({
      lat,
      lng,
      intensity,
      imageFilename,
      detectedObjects, 
    })
  );

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "map_data_points.json";
  a.click();
  URL.revokeObjectURL(url);
};

  const handleImport = () => {
    if (!jsonFile || !imageFiles) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedData = JSON.parse(reader.result as string) as DataPoint[];
        if (!Array.isArray(importedData)) throw new Error("JSON inválido");

        const cleanData = importedData.map((p) => ({
          ...p,
          imageBase64: "",
          detectedObjects: p.detectedObjects ?? {},
        }));

        let loadedImagesCount = 0;
        const updatedData = [...cleanData];

        Array.from(imageFiles).forEach((file) => {
          const imgReader = new FileReader();
          imgReader.onload = () => {
            const base64 = imgReader.result as string;
            for (let i = 0; i < updatedData.length; i++) {
              if (updatedData[i].imageFilename === file.name) {
                updatedData[i].imageBase64 = base64;
                break;
              }
            }
            loadedImagesCount++;
            if (loadedImagesCount === imageFiles.length) {
              setDataPoints(updatedData);
              setShowImportModal(false);
              setJsonFile(null);
              setImageFiles(null);
            }
          };
          imgReader.readAsDataURL(file);
        });
      } catch {
        alert("Erro ao ler JSON.");
      }
    };
    reader.readAsText(jsonFile);
  };

  const totalIntensity = dataPoints.reduce((sum, p) => sum + p.intensity, 0);
  const averageIntensity =
    dataPoints.length > 0
      ? (totalIntensity / dataPoints.length).toFixed(2)
      : "0.00";

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-white pt-20 px-4 sm:px-8">
      <Header />
      <section className="text-center mt-8 mb-12 max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold mb-4">
          Análise Inteligente de Focos
        </h2>
        <p className="text-zinc-400 text-lg">
          Essa página tem como principal funcionalidade oferecer uma visão ampla das cidades e focos de possivel dengue. além disso, o upload de imagens e coordenadas possibilita a importacao de dados em massa, algo necessario para a avaliacao de uma cidade inteira.
        </p>
      </section>

      {/* Botão para abrir o modal */}
      <div className="max-w-3xl mx-auto flex justify-center gap-4 mb-4">
        <button
          onClick={() => setShowImportModal(true)}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Importar Dados
        </button>

        <button
          onClick={handleExportJson}
          className="bg-zinc-700 px-4 py-2 rounded hover:bg-zinc-600 transition"
        >
          Exportar JSON
        </button>
      </div>

      {/* Modal de importação */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-zinc-800 p-6 rounded-md w-full max-w-md relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-2 right-3 text-white text-xl hover:text-red-400"
            >
              ×
            </button>
            <h3 className="mb-4 text-lg font-semibold text-white">
              Importar JSON + Imagens
            </h3>

           <div className="mb-6">
  <label
    htmlFor="jsonFileInput"
    className="flex items-center gap-2 mb-2 text-gray-200 font-semibold"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-indigo-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-3-3v6m-6 3h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2z"
      />
    </svg>
    Arquivo JSON
  </label>
  <input
    id="jsonFileInput"
    type="file"
    accept=".json"
    onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
    className="w-full rounded border border-gray-600 bg-gray-800 text-gray-100 p-2 cursor-pointer
      transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  />
</div>

<div className="mb-6">
  <label
    htmlFor="imageFilesInput"
    className="flex items-center gap-2 mb-2 text-gray-200 font-semibold"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-green-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l4-4h10l4 4M16 13l-3-3-2 2-3-3"
      />
    </svg>
    Imagens (múltiplas)
  </label>
  <input
    id="imageFilesInput"
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => setImageFiles(e.target.files || null)}
    className="w-full rounded border border-gray-600 bg-gray-800 text-gray-100 p-2 cursor-pointer
      transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
  />
</div>


            <button
              onClick={handleImport}
              disabled={!jsonFile || !imageFiles || imageFiles.length === 0}
              className={`w-full py-2 rounded ${
                jsonFile && imageFiles?.length
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-700 cursor-not-allowed"
              } transition text-white`}
            >
              Importar
            </button>
          </div>
        </div>
      )}

      <KPIs
        totalCases={totalIntensity}
        pointCount={dataPoints.length}
        avgIntensity={averageIntensity}
      />

      <div className="max-w-6xl mx-auto mb-12 rounded-xl overflow-hidden shadow-lg border border-zinc-800">
          <DynamicMap
          points={dataPoints}
          onMapClick={handleMapClick}
          onRemovePoint={handleRemovePoint} // passe a função aqui também
        />
      </div>

      {selectedCoords && (
        <IntensityForm
          selectedCoords={selectedCoords}
          onAdd={handleAddPoint}
          onCancel={() => {
            setSelectedCoords(null);
            setImageFile(null);
          }}
          imageFile={imageFile}
          setImageFile={setImageFile}
          uploading={uploading}
        />
      )}

      <Footer />
    </main>
  );
}
