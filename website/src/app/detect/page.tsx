"use client";

import Image from "next/image";
import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { FileImage } from "lucide-react";

export default function Detectar() {
  const [images, setImages] = useState<{ name: string; url: string; result?: any }[]>([]);
  const [sliderValue, setSliderValue] = useState([0.5]);
  const [showDetection, setShowDetection] = useState(true);

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const handleClearImages = () => {
    setImages([]);
  };

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/detect/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      setImages((prev) => [...prev, { name: file.name, url, result }]);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-zinc-950 text-white px-8 py-12">
      <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 bg-opacity-90 backdrop-blur-sm shadow-md flex justify-between items-center px-8 py-4 text-white">
        <a href="/"><h1 className="text-3xl font-bold tracking-tight">Undengue-Vision</h1></a>
        <nav className="flex gap-8 text-base font-medium">
          <a href="/" className="hover:underline">
            Home
          </a>
        </nav>
      </header>

      <main className="pt-28 flex mx-auto gap-12">
        {/* Sidebar de Controles */}
        <aside className="w-[350px] flex-shrink-0 sticky top-28 self-start space-y-12">
          {/* Upload Box */}
          <div>
            <label
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center w-full h-60 p-6 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-white hover:bg-zinc-800 transition-colors"
            >
              <FileImage className="w-12 h-12 text-zinc-400 mb-2" />
              <p className="text-zinc-400 text-center text-sm">
                Arraste uma imagem aqui ou clique para selecionar
              </p>
              <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>

          {/* Slider */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-zinc-300">Transparência da sobreposição</span>
              <span className="text-zinc-400 font-mono">{sliderValue[0].toFixed(2)}</span>
            </label>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-6"
              value={sliderValue}
              min={0}
              max={1}
              step={0.01}
              onValueChange={setSliderValue}
            >
              <Slider.Track className="bg-zinc-700 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-4 h-4 bg-white rounded-full shadow hover:bg-blue-400 focus:outline-none" />
            </Slider.Root>
          </div>

          {/* Checkbox + Clear Button */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showDetection}
                onChange={() => setShowDetection(!showDetection)}
                className="accent-blue-500 w-5 h-5"
              />
              <span className="text-zinc-300">Mostrar detecção</span>
            </label>

            <button
              onClick={handleClearImages}
              className="text-zinc-400 hover:text-white border border-zinc-600 hover:border-white px-4 py-1 rounded-md transition-colors text-sm"
            >
              Limpar imagens
            </button>
          </div>
        </aside>

        {/* Imagens e resultados */}
        <section className="flex-1">
          <h2 className="text-4xl font-bold text-center mb-12">Identificação</h2>

          {images.map((img, index) => (
            <div key={index} className="flex flex-row items-start gap-8 mb-6">


              <div className="relative w-full ">
                <Image
                  src={img.url}
                  alt="Detectado"
                  width={1000}
                  height={600}
                  className="rounded-xl object-contain w-full h-auto"
                />

                {img.result?.objetos
                  ?.filter((det: any) => det.confidence >= sliderValue[0])
                  .map((det: any, i: number) => {
                    const box = det.box;
                    const confidence = (det.confidence * 100).toFixed(1);
                    const label = `${det.class} (${confidence}%)`;

                    const originalWidth = box.original_width || 1000;
                    const originalHeight = box.original_height || 600;

                    const leftPercent = (box.x1 / originalWidth) * 100;
                    const topPercent = (box.y1 / originalHeight) * 100;
                    const widthPercent = ((box.x2 - box.x1) / originalWidth) * 100;
                    const heightPercent = ((box.y2 - box.y1) / originalHeight) * 100;

                    const cores_por_classe: { [key: string]: string } = {
                      carro: "rgb(155, 0, 0)",
                      piscina: "rgb(0, 0, 155)",
                      caixa_agua: "rgb(0, 155, 0)",
                    };

                    const corBox = cores_por_classe[det.class] || "rgb(255, 0, 0)";

                    return (
                      <div
                        key={i}
                        className="absolute border-2"
                        style={{
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                          width: `${widthPercent}%`,
                          height: `${heightPercent}%`,
                          borderColor: corBox,
                        }}
                      >
                        {showDetection && (
                          <span
                            className="absolute top-0 left-0 text-white text-xs px-1 rounded-br"
                            style={{ backgroundColor: corBox }}
                          >
                            {label}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Resultados da API */}
              {img.result && (
                <div className="mt-6 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300">
                  <h5 className="font-semibold text-white mb-2">📦 Resultado da Detecção:</h5>
                  {(() => {
                    const objetosFiltrados = img.result.objetos.filter((o: any) => o.confidence >= sliderValue[0]);
                    const contagemFiltrada: { [key: string]: number } = {};
                    objetosFiltrados.forEach((o: any) => {
                      contagemFiltrada[o.class] = (contagemFiltrada[o.class] || 0) + 1;
                    });

                    return (
                      <>
                        <p>Total de objetos: {objetosFiltrados.length}</p>
                        <ul className="list-disc list-inside">
                          {Object.entries(contagemFiltrada).map(([classe, quantidade], i) => (
                            <li key={i}>
                              {classe}: {quantidade}
                            </li>
                          ))}
                        </ul>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>

      <footer className="bg-zinc-900 text-zinc-400 text-center py-6 mt-12 border-t border-zinc-700">
        <a href="https://github.com/ionmateus/tcc" target="_blank" className="underline hover:text-white">
          GitHub do Projeto
        </a>
      </footer>
    </div>
  );
}
