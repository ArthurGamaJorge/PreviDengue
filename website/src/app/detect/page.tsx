"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import type React from "react";
import * as Slider from "@radix-ui/react-slider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileImage, X, MapPin, Box, ChevronsLeft, ChevronsRight } from "lucide-react";
import { API_URL } from "@/lib/config";

export default function Detectar() {
  const [images, setImages] = useState<
    { name: string; url: string; result?: any; loading: boolean }[]
  >([]);
  const [sliderValue, setSliderValue] = useState([0.5]);
  const [showDetection, setShowDetection] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([
    "piscina_limpa",
    "piscina_suja",
    "lona",
    "monte_de_lixo",
    "reservatorio_de_agua",
    "pneu", 
    "saco_de_lixo"
  ]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const transformRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [rightOpen, setRightOpen] = useState(true);
  const [sortByRisk, setSortByRisk] = useState(false);
  // Zoom & pan state por imagem
  const [zoomScales, setZoomScales] = useState<number[]>([]);
  const [panOffsets, setPanOffsets] = useState<{x:number;y:number}[]>([]);
  const [isPanning, setIsPanning] = useState<boolean[]>([]);
  const [panStart, setPanStart] = useState<{x:number;y:number} | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setRightOpen(false);
    }
  }, []);

  // Evita scroll da página enquanto faz zoom com a roda do mouse sobre o container
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Se estiver dentro de um container de imagem (group zoom container), bloqueia scroll da página
      const zoomContainer = target.closest('[data-zoom-container="true"]');
      if (zoomContainer) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler as EventListener);
  }, []);

  // Variável movida para um escopo global no componente
const cores_por_classe: { [key: string]: string } = {
  piscina_limpa: "rgb(0, 150, 255)",      
  piscina_suja: "rgb(107, 142, 35)",     
  lona: "rgb(255, 140, 0)",             
  monte_de_lixo: "rgb(139, 69, 19)",    
  reservatorio_de_agua: "rgb(47, 79, 79)",
  pneu: "rgb(220, 20, 60)",              
  saco_de_lixo: "rgb(128, 0, 128)"       
};

// Nomes amigáveis para exibição
const nomes_por_classe: { [key: string]: string } = {
  piscina_limpa: "Piscina limpa",
  piscina_suja: "Piscina suja",
  lona: "Lona",
  monte_de_lixo: "Monte de lixo",
  reservatorio_de_agua: "Reservatório de água",
  pneu: "Pneu",
  saco_de_lixo: "Saco de lixo",
};
const displayNome = (key: string) => nomes_por_classe[key] ?? key.replace(/_/g, " ");

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

  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Escala de intensidade: maior score da API vira 10
  const maxIntensityRaw = Math.max(0, ...images.map(im => Number(im.result?.intensity_score ?? 0)));
  const getScaledIntensity = (raw: number) => (maxIntensityRaw > 0 ? Math.min(10, (raw / maxIntensityRaw) * 10) : 0);

  // Inicializa arrays auxiliares quando imagens mudam
  useEffect(() => {
    setZoomScales((prev) => images.map((_, i) => prev[i] ?? 1));
    setPanOffsets((prev) => images.map((_, i) => prev[i] ?? {x:0,y:0}));
    setIsPanning((prev) => images.map((_, i) => prev[i] ?? false));
  }, [images.length]);

  const onWheelZoom = (idx: number, e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = transformRefs.current[idx];
    const rect = el?.getBoundingClientRect();
    const currentScale = zoomScales[idx] ?? 1;
    const delta = -e.deltaY;
    const rawFactor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.min(6, Math.max(1, currentScale * rawFactor));
    const factor = newScale / currentScale;

    if (!rect) {
      setZoomScales((zs) => zs.map((z, i) => (i === idx ? newScale : z)));
      return;
    }

    // posição do cursor dentro do elemento transformado (após transform)
    const qx = e.clientX - rect.left;
    const qy = e.clientY - rect.top;

    setZoomScales((zs) => zs.map((z, i) => (i === idx ? newScale : z)));
    setPanOffsets((po) => po.map((p, i) => {
      if (i !== idx) return p;
      const tx = p?.x ?? 0;
      const ty = p?.y ?? 0;
      return { x: tx - qx * (factor - 1), y: ty - qy * (factor - 1) };
    }));
  };
  const onMouseDown = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPanning((p) => p.map((v, i) => i === idx ? true : v));
    setPanStart({ x: e.clientX, y: e.clientY });
  };
  const onMouseMove = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning[idx] || !panStart) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setPanOffsets((po) => po.map((v, i) => i === idx ? { x: v.x + dx, y: v.y + dy } : v));
    setPanStart({ x: e.clientX, y: e.clientY });
  };
  const onMouseUpLeave = (idx: number) => {
    setIsPanning((p) => p.map((v, i) => i === idx ? false : v));
    setPanStart(null);
  };

  const resetView = (idx: number) => {
    setZoomScales((zs) => zs.map((z, i) => (i === idx ? 1 : z)));
    setPanOffsets((po) => po.map((o, i) => (i === idx ? { x: 0, y: 0 } : o)));
  };

  return (
    <div ref={topRef} className="min-h-screen font-sans bg-gradient-to-br from-zinc-950 to-zinc-900 text-white px-4 sm:px-8 pb-0 pt-0">
      <Header />

      <main className="pt-24 flex mx-auto gap-8">
        {/* Sidebar de Controles */}
        <aside className="w-[350px] flex-shrink-0 sticky top-24 self-start space-y-4">


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
              {["piscina_limpa","piscina_suja","lona","monte_de_lixo","reservatorio_de_agua", "pneu", "saco_de_lixo"].map((className) => (
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
                  <span className="text-zinc-200">{displayNome(className)}</span>
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
                        ref={(el) => {
                          imageRefs.current[index] = el;
                        }}
            className="flex flex-col gap-6 relative bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-xl"
          >
                        {/* Imagem e as caixas de detecção */}
                        <div
                          data-zoom-container="true"
                          className={`relative w-full group overflow-hidden rounded-xl bg-black/20 select-none overscroll-none touch-none ${isPanning[index] ? "cursor-grabbing" : "cursor-grab"}`}
                          onWheel={(e) => onWheelZoom(index, e)}
                          onMouseDown={(e) => onMouseDown(index, e)}
                          onMouseMove={(e) => onMouseMove(index, e)}
                          onMouseUp={() => onMouseUpLeave(index)}
                          onMouseLeave={() => onMouseUpLeave(index)}
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            <div
                              ref={(el) => { transformRefs.current[index] = el; }}
                              className="relative inline-block"
                              style={{
                                transform: `translate(${panOffsets[index]?.x ?? 0}px, ${panOffsets[index]?.y ?? 0}px) scale(${zoomScales[index] ?? 1})`,
                                transformOrigin: '0 0',
                                transition: 'none',
                              }}
                            >
                              <Image
                                src={img.url}
                                alt="Imagem para detecção"
                                width={750}
                                height={400}
                                className="block max-w-full h-auto select-none pointer-events-none"
                                draggable={false}
                              />
                              {/* Overlay de caixas dentro do mesmo contexto transformado */}
                              <div className="absolute inset-0 pointer-events-none select-none">
                                {img.result?.objetos
                                  ?.filter(
                                    (det: any) =>
                                      det.confidence >= sliderValue[0] &&
                                      selectedClasses.includes(det.class)
                                  )
                                  .map((det: any, i: number) => {
                                    const box = det.box;
                                    const confidence = (det.confidence * 100).toFixed(1);
                                    const label = `${displayNome(det.class)} (${confidence}%)`;

                                    const originalWidth = box.original_width || 1000;
                                    const originalHeight = box.original_height || 600;

                                    const leftPercent = (box.x1 / originalWidth) * 100;
                                    const topPercent = (box.y1 / originalHeight) * 100;
                                    const widthPercent = ((box.x2 - box.x1) / originalWidth) * 100;
                                    const heightPercent = ((box.y2 - box.y1) / originalHeight) * 100;

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
                            </div>
                          </div>

                            <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 hover:scale-110 shadow-md"
                                title="Remover imagem"
                            >
                                <X size={20} />
                            </button>
                                <button
                                  onClick={() => resetView(index)}
                                  className="absolute top-2 right-12 bg-zinc-800/80 text-white rounded-full px-2 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-700 shadow-md border border-zinc-600 text-xs"
                                  title="Reiniciar zoom"
                                >
                                  Fit
                                </button>
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
                                      const raw = Number(img.result?.intensity_score ?? 0);
                                      const scaled = getScaledIntensity(raw);
                                      const pct = Math.max(0, Math.min(100, (scaled / 10) * 100));
                                      const barColor = scaled >= 7.5 ? "bg-red-500" : scaled >= 4 ? "bg-yellow-500" : "bg-green-500";
                                      return (
                                        <div className="mb-4">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-zinc-300">Intensidade estimada</span>
                                            <span className="text-zinc-200 font-semibold">{scaled.toFixed(1)} / 10</span>
                                          </div>
                                          <div className="h-2 w-full bg-zinc-800 rounded">
                                            <div className={`h-2 rounded ${barColor}`} style={{ width: `${pct}%` }} />
                                          </div>
                                        </div>
                                      );
                                    })()}
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
                                                        <span className="font-semibold">{displayNome(classe)}: {quantidade}</span>
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

        {/* Painel da Direita: Navegação com Miniaturas */}
        {rightOpen && (
          <aside className="w-[320px] hidden lg:block flex-shrink-0 sticky top-24 self-start">
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-zinc-300 font-semibold text-lg">Navegação</h3>
                <button
                  onClick={() => setRightOpen(false)}
                  className="p-2 rounded border border-zinc-600 hover:border-white text-zinc-300 hover:text-white"
                  title="Fechar painel"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={scrollToTop}
                  className="text-xs px-2 py-2 rounded border border-zinc-600 hover:border-white text-zinc-300 hover:text-white w-full"
                  title="Voltar ao topo"
                >
                  Topo
                </button>
                <button
                  onClick={() => setSortByRisk(v => !v)}
                  className="text-xs px-2 py-2 rounded border border-zinc-600 hover:border-white text-zinc-300 hover:text-white w-full"
                  title="Ordenar por maior risco"
                >
                  {sortByRisk ? "Ordem original" : "Ordenar por risco"}
                </button>
              </div>
              {images.length === 0 ? (
                <p className="text-zinc-500 text-sm">Nenhuma imagem enviada.</p>
              ) : (
                <ul className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                  {(() => {
                    const items = images.map((img, idx) => {
                      const raw = Number(img.result?.intensity_score ?? 0);
                      const scaled = getScaledIntensity(raw);
                      return { idx, img, raw, scaled };
                    });
                    const ordered = sortByRisk ? [...items].sort((a, b) => b.scaled - a.scaled) : items;
                    return ordered.map(({ idx, img, scaled }) => (
                      <li key={idx}>
                        <button
                          onClick={() => imageRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className="w-full flex items-center gap-3 p-2 rounded-lg border border-zinc-700 hover:border-blue-500 text-left bg-zinc-800 group"
                          title={img.name}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-12 h-12 object-cover rounded-md border border-zinc-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-zinc-200 truncate">
                              <span className="font-mono text-xs text-zinc-400 mr-2">#{idx + 1}</span>
                              {img.name}
                            </div>
                            {img.loading ? (
                              <div className="text-xs text-zinc-500">processando…</div>
                            ) : (
                              <div className="text-xs text-zinc-500 flex items-center">
                                <span>{img.result?.objetos?.length ?? 0} objetos</span>
                                <span className={`ml-auto px-2 py-0.5 rounded-full border ${
                                  scaled >= 7.5 ? "border-red-500 text-red-400" : scaled >= 4 ? "border-yellow-500 text-yellow-400" : "border-green-500 text-green-400"
                                }`}>
                                  Int {scaled.toFixed(1)} / 10
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Aba flutuante para abrir/fechar o painel da direita */}
      <button
        onClick={() => setRightOpen((v) => !v)}
        className="fixed right-2 top-1/2 -translate-y-1/2 z-50 bg-zinc-800 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white rounded-l px-2 py-2 shadow hidden lg:flex"
        title={rightOpen ? "Esconder navegação" : "Mostrar navegação"}
      >
        {rightOpen ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>
      <Footer />

    </div>
  );
}