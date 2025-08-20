"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import * as Slider from "@radix-ui/react-slider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import YoloDetectionSection from "@/components/YOLOSummarySection";
import { FileImage, Info, X, MapPin, Box } from "lucide-react";
import { API_URL } from "@/lib/config";

export default function Detectar() {
  const [images, setImages] = useState<
    { name: string; url: string; result?: any; loading: boolean }[]
  >([]);
  const [sliderValue, setSliderValue] = useState([0.5]);
  const [showDetection, setShowDetection] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([
    "carro",
    "piscina",
    "caixa_agua",
  ]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Variável movida para um escopo global no componente
  const cores_por_classe: { [key: string]: string } = {
    carro: "rgb(155, 0, 0)",
    piscina: "rgb(0, 0, 155)",
    caixa_agua: "rgb(0, 155, 0)",
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  useEffect(() => {
    function handlePaste(e: globalThis.ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            processFiles([file]);
          }
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const handleClearImages = () => {
    setImages([]);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const processFiles = async (files: File[]) => {
    const newImages = files.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      loading: true,
    }));
    setImages(prev => [...prev, ...newImages]);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(API_URL + "/detect/", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Erro na detecção.');
        }

        const result = await response.json();

        setImages(prev =>
          prev.map(img =>
            img.name === file.name && img.loading ? { ...img, result, loading: false } : img
          )
        );
      } catch (error) {
        console.error("Falha ao processar arquivo:", file.name, error);
        setImages(prev =>
          prev.map(img =>
            img.name === file.name && img.loading ? { ...img, loading: false } : img
          )
        );
      }
    }
  };

  const handleClassFilterChange = (className: string) => {
    setSelectedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((item) => item !== className)
        : [...prev, className]
    );
  };

  const openDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const closeDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  };

  return (
    <div className="min-h-screen font-sans bg-zinc-950 text-white px-8 py-12">
      <Header />

      <main className="pt-28 flex mx-auto gap-8">
        {/* Sidebar de Controles */}
        <aside className="w-[350px] flex-shrink-0 sticky top-28 self-start space-y-4">


          {/* Upload Box */}
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
            <label
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center w-full h-48 p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-zinc-800 transition-colors"
            >
              <FileImage className="w-10 h-10 text-zinc-400 mb-2" />
              <p className="text-zinc-400 text-center text-sm">
                Arraste uma imagem aqui ou clique para selecionar
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Grupo de Controles (Slider, Checkbox, Botão de Limpar) */}
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg space-y-6">
            {/* Slider */}
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-zinc-300">Mínimo de Confiança</span>
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
                <Slider.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
              </Slider.Root>
            </div>

            {/* Checkbox + Clear Button */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={showDetection}
                  onChange={() => setShowDetection(!showDetection)}
                  className="accent-blue-500 w-5 h-5 rounded"
                />
                <span className="text-zinc-300">Mostrar Confiança</span>
              </label>

              <button
                onClick={handleClearImages}
                className="text-zinc-400 hover:text-white border border-zinc-600 hover:border-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Limpar imagens
              </button>
            </div>
          </div>

          {/* Filtro de Classes */}
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-zinc-300 font-semibold text-lg mb-4">
              Filtrar por Classe
            </h3>
            <div className="space-y-4">
              {["carro", "piscina", "caixa_agua"].map((className) => (
                <label
                  key={className}
                  className="flex items-center gap-3 text-zinc-300 text-sm cursor-pointer hover:text-blue-500"
                >
                  <input
                    type="checkbox"
                    checked={selectedClasses.includes(className)}
                    onChange={() => handleClassFilterChange(className)}
                    className="accent-blue-500 w-5 h-5 border-2 border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-zinc-200">{className}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Imagens e resultados */}
        <section className="flex-1">

          <div className="space-y-8">
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] bg-zinc-900 rounded-xl border border-zinc-800">
                    <FileImage className="w-20 h-20 text-zinc-700 mb-4" />
                    <p className="text-zinc-500 text-xl font-medium">Faça o upload de uma imagem para começar a detecção.</p>
                </div>
            ) : (
                images.map((img, index) => (
                    <div
                        key={index}
                        className="flex flex-col gap-6 relative bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-xl"
                    >
                        {/* Imagem e as caixas de detecção */}
                        <div className="relative w-full group">
                            <Image
                                src={img.url}
                                alt="Imagem para detecção"
                                width={750}
                                height={400}
                                className="rounded-xl object-contain w-full h-auto"
                            />

                            <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 hover:scale-110 shadow-md"
                                title="Remover imagem"
                            >
                                <X size={20} />
                            </button>
                            
                            {img.result?.objetos
                                ?.filter(
                                    (det: any) =>
                                        det.confidence >= sliderValue[0] &&
                                        selectedClasses.includes(det.class)
                                )
                                .map((det: any, i: number) => {
                                    const box = det.box;
                                    const confidence = (det.confidence * 100).toFixed(1);
                                    const label = `${det.class} (${confidence}%)`;

                                    const originalWidth = box.original_width || 1000;
                                    const originalHeight = box.original_height || 600;

                                    const leftPercent = (box.x1 / originalWidth) * 100;
                                    const topPercent = (box.y1 / originalHeight) * 100;
                                    const widthPercent =
                                        ((box.x2 - box.x1) / originalWidth) * 100;
                                    const heightPercent =
                                        ((box.y2 - box.y1) / originalHeight) * 100;

                                    const corBox = cores_por_classe[det.class] || "rgb(255, 0, 0)";

                                    return (
                                        <div
                                            key={i}
                                            className="absolute border-2 animate-fade-in"
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

                        {/* Resultados da API (Agora abaixo da imagem) */}
                        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-xl p-6 shadow-md text-sm text-zinc-300">
                            {!img.result ? (
                                <div className="animate-pulse flex items-center gap-4">
                                    <div className="h-6 w-6 rounded-full bg-zinc-700"></div>
                                    <div className="h-4 bg-zinc-700 rounded w-full"></div>
                                </div>
                            ) : (
                                <>
                                    <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                                        <Box size={20} className="text-blue-400" />
                                        <span>Resultado da Detecção</span>
                                    </h5>
                                    {(() => {
                                        const objetosFiltrados = img.result.objetos.filter(
                                            (o: any) =>
                                                o.confidence >= sliderValue[0] &&
                                                selectedClasses.includes(o.class)
                                        );
                                        const contagemFiltrada: { [key: string]: number } = {};
                                        objetosFiltrados.forEach((o: any) => {
                                            contagemFiltrada[o.class] = (contagemFiltrada[o.class] || 0) + 1;
                                        });
                                        
                                        return (
                                            <>
                                                <div className="flex items-center gap-2 mb-2 text-zinc-400">
                                                  <MapPin size={16} />
                                                  <span>Total de objetos detectados: <span className="font-bold text-white">{objetosFiltrados.length}</span></span>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    {Object.entries(contagemFiltrada).map(([classe, quantidade], i) => (
                                                      <div key={i} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full text-zinc-200">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cores_por_classe[classe] }}></span>
                                                        <span className="font-semibold">{classe}: {quantidade}</span>
                                                      </div>
                                                    ))}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                ))
            )}
          </div>
        </section>
      </main>

      <YoloDetectionSection></YoloDetectionSection>

      <Footer />

    </div>
  );
}