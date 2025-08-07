"use client";

import dynamic from "next/dynamic";
import { useState, ChangeEvent } from "react";
import KPIs from "@/components/KPIs";
import IntensityForm from "@/components/IntensityForm";
import municipiosData from '../../public/data/municipios.json'; // Importando o arquivo JSON diretamente

import { useRef, useEffect } from "react";

const DynamicMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
});

interface DataPoint {
  lat: number;
  lng: number;
  intensity: number;
  imageFilename: string | null;
  imageBase64: string;
  detectedObjects: Record<string, number>;
}

// Interface para os dados do município
interface Municipio {
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

export default function MapSection() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [jsonImageFilenames, setJsonImageFilenames] = useState<Set<string>>(new Set());
  const [imageFileNames, setImageFileNames] = useState<Set<string>>(new Set());
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // Novos estados para a funcionalidade de busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCities, setFilteredCities] = useState<Municipio[]>([]);
  const [selectedCityData, setSelectedCityData] = useState<Municipio | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Lógica de busca e seleção de municípios
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.length > 0) {
      setFilteredCities(
        municipiosData.filter(city =>
          city.nome.toLowerCase().startsWith(term.toLowerCase())
        )
      );
    } else {
      setFilteredCities([]);
    }
  };

  const handleSelectCity = (city: Municipio) => {
    setSelectedCityData(city);
    setSearchTerm(city.nome);
    setFilteredCities([]);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedCityData) {
      setMapCenter([selectedCityData.latitude, selectedCityData.longitude]);
    }
  };

  // Lógica de manipulação de dados para a seção do mapa
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

      const data = await res.json();

      const newPoint: DataPoint = {
        lat: selectedCoords[0],
        lng: selectedCoords[1],
        intensity: data.intensity_score ?? 0,
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

  function validateImageJsonMatch(
    jsonNames: Set<string>,
    imageNames: Set<string>
  ) {
    const warnings: string[] = [];
    const missingImages = [...jsonNames].filter(
      (name) => !imageNames.has(name)
    );
    const extraImages = [...imageNames].filter((name) => !jsonNames.has(name));
    if (missingImages.length > 0) {
      warnings.push(`Faltando imagens para o JSON: ${missingImages.join(", ")}`);
    }
    if (extraImages.length > 0) {
      warnings.push(`Imagens selecionadas que não constam no JSON: ${extraImages.join(", ")}`);
    }
    setImportWarnings(warnings);
  }

  const handleJsonChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setJsonFile(file);
    if (!file) {
      setJsonImageFilenames(new Set());
      validateImageJsonMatch(new Set(), imageFileNames);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as DataPoint[];
        if (!Array.isArray(data)) throw new Error("JSON inválido");
        const filenames = new Set(data.map((point) => point.imageFilename).filter(Boolean) as string[]);
        setJsonImageFilenames(filenames);
        validateImageJsonMatch(filenames, imageFileNames);
      } catch {
        setJsonImageFilenames(new Set());
        setImportWarnings(["JSON inválido"]);
      }
    };
    reader.readAsText(file);
  };

  const handleImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) {
      setImageFileNames(new Set());
      validateImageJsonMatch(jsonImageFilenames, new Set());
      setImageFiles(null);
      return;
    }
    const names = new Set(Array.from(files).map((f) => f.name));
    setImageFileNames(names);
    validateImageJsonMatch(jsonImageFilenames, names);
    setImageFiles(files);
  };

  const handleImport = async () => {
    if (!jsonFile || !imageFiles) return;
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const importedData = JSON.parse(reader.result as string) as DataPoint[];
          if (!Array.isArray(importedData)) throw new Error("JSON inválido");
          const imageMap = new Map<string, File>();
          Array.from(imageFiles).forEach((file) => {
            imageMap.set(file.name, file);
          });
          const updatedData: DataPoint[] = [];
          for (const point of importedData) {
            if (!point.imageFilename) continue;
            const imageFile = imageMap.get(point.imageFilename);
            if (!imageFile) continue;
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject("Erro ao ler imagem");
              reader.readAsDataURL(imageFile);
            });
            let detectedObjects = point.detectedObjects ?? null;
            let intensity = point.intensity ?? null;
            if (!detectedObjects || intensity === null || intensity === undefined) {
              const formData = new FormData();
              formData.append("file", imageFile);
              const res = await fetch("http://localhost:8000/detect/", {
                method: "POST",
                body: formData,
              });
              if (!res.ok) throw new Error("Erro ao processar imagem");
              const data = await res.json();
              detectedObjects = data.contagem ?? {};
              intensity = data.intensity_score ?? 0;
            }
            updatedData.push({
              lat: point.lat,
              lng: point.lng,
              imageFilename: point.imageFilename,
              imageBase64: base64,
              detectedObjects,
              intensity,
            });
          }
          setDataPoints(updatedData);
          setShowImportModal(false);
          setJsonFile(null);
          setImageFiles(null);
        } catch (err) {
          console.error(err);
          alert("Erro ao importar dados. Verifique o JSON e as imagens.");
        }
      };
      reader.readAsText(jsonFile);
    } catch {
      alert("Erro ao processar arquivo.");
    }
  };

  const closeModal = () => {
    setShowImportModal(false);
    setImportWarnings([]);
    setJsonFile(null);
    setImageFiles(null);
    setJsonImageFilenames(new Set());
    setImageFileNames(new Set());
  };

  const totalIntensity = dataPoints.reduce((sum, p) => sum + p.intensity, 0);
  const averageIntensity =
    dataPoints.length > 0
      ? (totalIntensity / dataPoints.length).toFixed(2)
      : "0.00";

      return (
        <>
          <section className="text-center mt-8 mb-12 max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">Análise Inteligente de Focos</h2>
            <p className="text-zinc-400 text-lg">
              Essa página tem como principal funcionalidade oferecer uma visão ampla das cidades e focos de possível dengue. Além disso, o upload de imagens e coordenadas possibilita a importação de dados em massa, algo necessário para a avaliação de uma cidade inteira.
            </p>
          </section>
      
          <div className="flex flex-col lg:flex-row gap-4 mb-12 items-stretch">
            <div className="flex flex-col gap-4 lg:w-1/5">
              <div className="flex flex-col gap-4">
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
              <KPIs
                totalCases={totalIntensity}
                pointCount={dataPoints.length}
                avgIntensity={averageIntensity}
              />
              {/* Nova seção de busca de municípios movida para aqui */}
              <div className="bg-zinc-900 p-4 rounded-xl shadow-lg border border-zinc-800">
                <h4 className="text-base font-bold mb-2 text-white">Buscar Município</h4>
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Nome do município..."
                    className="w-full p-2 pl-3 pr-10 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </form>
                {searchTerm && filteredCities.length > 0 && (
                  <div className="mt-2 p-2 bg-zinc-800 rounded-lg max-h-40 overflow-y-auto border border-zinc-700">
                    <h5 className="font-semibold text-zinc-300 mb-1 text-sm">Resultados:</h5>
                    <ul>
                      {filteredCities.map((city) => (
                        <li
                          key={city.codigo_ibge}
                          onClick={() => handleSelectCity(city)}
                          className="p-1 text-zinc-300 text-sm hover:bg-zinc-700 cursor-pointer rounded transition"
                        >
                          {city.nome}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
      
            <div className="flex-1 rounded-xl overflow-hidden shadow-lg border border-zinc-800">
              {isClient ? (
                <DynamicMap
                  points={dataPoints}
                  onMapClick={handleMapClick}
                  onRemovePoint={handleRemovePoint}
                  centerCoords={mapCenter}
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[600px] bg-zinc-900 text-zinc-400 text-lg">
                  <p>Carregando mapa...</p>
                </div>
              )}
            </div>
          </div>
      
          {showImportModal && (
            <div
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
              onClick={closeModal}
            >
              <div className="bg-zinc-800 p-6 rounded-md w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={closeModal}
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
                    onChange={handleJsonChange}
                    className="w-full rounded border border-gray-600 bg-gray-800 text-gray-100 p-2 cursor-pointer transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    onChange={handleImagesChange}
                    className="w-full rounded border border-gray-600 bg-gray-800 text-gray-100 p-2 cursor-pointer transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {jsonFile && imageFiles && importWarnings.length > 0 && (
                  <div className="mb-6 p-3 rounded bg-red-800 text-red-200 text-sm max-h-40 overflow-auto">
                    {importWarnings.map((msg, idx) => (
                      <p key={idx}>{msg}</p>
                    ))}
                  </div>
                )}
                <details className="mb-6 bg-zinc-700 rounded p-4 text-sm text-gray-100">
                  <summary className="cursor-pointer font-semibold text-base mb-2 text-white">
                    📄 Ver modelo de JSON aceito
                  </summary>
                  <div className="mt-2 space-y-3">
                    <p>O arquivo JSON deve conter uma lista com as chaves:</p>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      <li>
                        <strong>lat</strong> e <strong>lng</strong>: coordenadas do
                        ponto, no formato decimal.
                      </li>
                      <li>
                        <strong>imageFilename</strong>: nome do arquivo da imagem
                        correspondente.
                      </li>
                      <li>
                        <strong>intensity</strong> (opcional):
                        <span className="text-yellow-400">
                          ⚠️ Se você estiver criando o JSON externamente, **não
                          manipule esse campo**.
                        </span>
                      </li>
                      <li>
                        <strong>detectedObjects</strong> (opcional):
                        <span className="text-yellow-400">
                          ⚠️ Se você estiver criando o JSON externamente, **não
                          manipule esse campo**.
                        </span>
                      </li>
                    </ul>
                    <p className="text-gray-400">
                      Caso algum campo opcional não esteja presente, a IA calculará
                      os valores.
                    </p>
                    <pre className="whitespace-pre-wrap font-mono bg-zinc-800 p-3 rounded border border-zinc-600 overflow-auto text-gray-200 text-xs">
                      {`[
        {
          "lat": -23.54395455873987,
          "lng": -46.625904487997225,
          "intensity": 9,
          "imageFilename": "img-54.png",
          "detectedObjects": {
            "caixa_agua": 3
          }
        },
        {
          "lat": -23.555206120737367,
          "lng": -46.66365382056169,
          "imageFilename": "img-8.png",
          "detectedObjects": {
            "carro": 94,
            "piscina": 9
          }
        }
      ]`}
                    </pre>
                  </div>
                </details>
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
        </>
      );
}