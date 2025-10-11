"use client";

import dynamic from "next/dynamic";
import { useState, ChangeEvent, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps, Cell } from 'recharts';
import municipiosData from '../../public/data/municipios.json';
import { API_URL } from "@/lib/config";
import { Search, Upload, ChevronDown, Download, X, FileBarChart2, FileJson, Loader2, Plus, RefreshCcw } from 'lucide-react';

// Interfaces de Dados
interface DataPoint {
  lat: number;
  lng: number;
  intensity: number;
  imageFilename: string | null;
  imageBase64: string;
  detectedObjects: Record<string, number>;
}

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

interface ChartData {
  intensity: number;
  count: number;
  color: string;
}

// NOVO: Interface para as props do componente MapSection
interface MapSectionProps {
  dataPoints: DataPoint[];
  onDataChange: (newData: DataPoint[]) => void;
  selectedCity: Municipio;
  onCityChange: (newCity: Municipio) => void;
}

const DynamicMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
});

const IntensityForm = dynamic(() => import("@/components/IntensityForm"), {
  ssr: false,
});

// Componente de Tooltip Customizado para o Gráfico de Barras
const CustomBarTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartData;
    return (
      <div className="p-2 bg-zinc-800/90 backdrop-blur-sm rounded-lg border border-zinc-700 shadow-xl text-white text-sm">
        <p className="font-bold">{`Intensidade ${data.intensity}`}</p>
        <p className="mt-1">{`Total de Focos: ${data.count}`}</p>
      </div>
    );
  }
  return null;
};

// Funções de Análise e Geração de Dados
const getIntensityColor = (intensity: number) => {
  const hue = (1 - intensity / 10) * 240;
  return `hsl(${hue}, 80%, 50%)`;
};

const getIntensityData = (dataPoints: DataPoint[]) => {
  const intensityCounts = dataPoints.reduce((acc: Record<number, number>, point) => {
    const intensity = Math.round(point.intensity);
    acc[intensity] = (acc[intensity] || 0) + 1;
    return acc;
  }, {});

  const data: ChartData[] = [];
  for (let i = 0; i <= 10; i++) {
    data.push({
      intensity: i,
      count: intensityCounts[i] || 0,
      color: getIntensityColor(i),
    });
  }
  return data;
};

// Componente principal da seção do Mapa
export default function MapSection({ dataPoints, onDataChange, selectedCity, onCityChange }: MapSectionProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [jsonImageFilenames, setJsonImageFilenames] = useState<Set<string>>(new Set());
  const [imageFileNames, setImageFileNames] = useState<Set<string>>(new Set());
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState(selectedCity.nome);
  const [filteredCities, setFilteredCities] = useState<Municipio[]>([]);
  
  // NOVO: mapa já começa na cidade selecionada
  const [mapCenter, setMapCenter] = useState<[number, number]>([selectedCity.latitude, selectedCity.longitude]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // NOVO: Atualiza o centro do mapa quando a cidade selecionada muda
  useEffect(() => {
    setMapCenter([selectedCity.latitude, selectedCity.longitude]);
  }, [selectedCity]);
  
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
    // NOVO: Chama a função do componente pai para atualizar a cidade
    onCityChange(city);
    setSearchTerm(city.nome);
    setFilteredCities([]);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const city = municipiosData.find(c => c.nome.toLowerCase() === searchTerm.toLowerCase());
    if (city) {
      onCityChange(city);
    }
  };

  const UF_BY_CODE: Record<number, string> = useMemo(() => ({
    11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
    21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
    31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'
  }), []);

  const formatCityLabel = (city: Municipio) => {
    const uf = UF_BY_CODE[city.codigo_uf];
    return uf ? `${uf} - ${city.nome}` : city.nome;
  };

  // Lógica de manipulação de dados para a seção do Mapa
  const handleMapClick = (e: [number, number]) => setSelectedCoords(e);

  const handleRemovePoint = (index: number) => {
    // Usa a prop onDataChange para atualizar o estado no componente pai
    onDataChange(dataPoints.filter((_, i) => i !== index));
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

      const res = await fetch(API_URL + "/detect/", {
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

      // Usa a prop onDataChange para atualizar o estado no componente pai
      onDataChange([...dataPoints, newPoint]);
      setSelectedCoords(null);
      setImageFile(null);
    } catch {
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

  const handleReplaceImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setImageFiles(newFiles);
    const names = new Set(newFiles.map((f) => f.name));
    setImageFileNames(names);
    validateImageJsonMatch(jsonImageFilenames, names);
    e.target.value = '';
  };
  
  const handleAddImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const allFiles = [...imageFiles, ...newFiles];
    setImageFiles(allFiles);
    const names = new Set(allFiles.map((f) => f.name));
    setImageFileNames(names);
    validateImageJsonMatch(jsonImageFilenames, names);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!jsonFile || imageFiles.length === 0) return;
    setIsImporting(true);
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
              const res = await fetch(API_URL + "/detect/", {
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
          // Usa a prop onDataChange para atualizar o estado no componente pai
          onDataChange(updatedData);
          setShowImportModal(false);
          setJsonFile(null);
          setImageFiles([]);
          setIsImporting(false); 
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
    setImageFiles([]);
    setJsonImageFilenames(new Set());
    setImageFileNames(new Set());
  };

  const totalIntensity = useMemo(() => dataPoints.reduce((sum, p) => sum + p.intensity, 0), [dataPoints]);
  const averageIntensity = useMemo(() => dataPoints.length > 0 ? (totalIntensity / dataPoints.length).toFixed(2) : "0.00", [totalIntensity, dataPoints.length]);
  const intensityData = useMemo(() => getIntensityData(dataPoints), [dataPoints]);

  return (
    <>
      <div className="w-full p-8 animate-fade-in-up h-full flex flex-col">        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <h2 className="text-4xl font-bold text-white">Painel de Análise</h2>
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar município..."
                className="w-full p-3 pl-4 pr-12 rounded-full bg-zinc-800 border-2 border-transparent text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
            {searchTerm && filteredCities.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-2 p-2 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 max-h-40 overflow-y-auto">
                <ul>
                  {filteredCities.map((city) => (
                    <li
                      key={city.codigo_ibge}
                      onClick={() => handleSelectCity(city)}
                      className="p-2 text-zinc-300 text-sm hover:bg-zinc-700 cursor-pointer rounded-lg transition-colors text-left"
                    >
                      {formatCityLabel(city)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>
      
        <div className="flex flex-col lg:flex-row gap-8 items-stretch flex-1">
          {/* Painel Lateral */}
          <div className="flex flex-col gap-6 lg:w-1/4 p-6 bg-zinc-900/80 backdrop-blur-sm rounded-lg shadow-xl border border-zinc-800">
            {/* Botões de Ação */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-green-600 px-4 py-3 rounded-lg text-white font-semibold transition-colors duration-200 hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Upload size={20} />
                Importar Dados
              </button>
              <button
                onClick={handleExportJson}
                className="bg-zinc-700 px-4 py-3 rounded-lg text-white font-semibold transition-colors duration-200 hover:bg-zinc-600 flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Exportar JSON
              </button>
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <p className="text-3xl font-bold text-blue-400">{dataPoints.length}</p>
                <p className="text-zinc-400 text-sm mt-1">Total de Focos</p>
              </div>
              <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <p className="text-3xl font-bold text-red-400">{averageIntensity}</p>
                <p className="text-zinc-400 text-sm mt-1">Média de Intensidade</p>
              </div>
            </div>
            
            {/* Gráfico de Barras */}
            <div>
              <h4 className="flex items-center gap-2 text-xl font-bold mb-3 text-white">
                <FileBarChart2 size={20} />
                Focos por Intensidade
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intensityData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" stroke="#999" tick={{ fill: '#bbb' }} hide />
                    <YAxis type="category" dataKey="intensity" stroke="#999" tick={{ fill: '#bbb' }} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(120, 119, 198, 0.1)' }} />
                    <Bar dataKey="count" fill="#8884d8" background={{ fill: '#444' }}>
                        {intensityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Legenda de Gradiente */}
            <div>
              <div className="flex justify-between items-center text-sm mb-1 text-zinc-400">
                <span>0</span>
                <span>10</span>
              </div>
              <div className="h-4 w-full rounded-full"
                style={{
                  background: "linear-gradient(to right, hsl(240, 80%, 50%), hsl(120, 80%, 50%), hsl(60, 80%, 50%), hsl(30, 80%, 50%), hsl(0, 80%, 50%))",
                }}
              />
              <p className="text-xs text-zinc-500 mt-2 italic">
                A intensidade do foco varia de 0 (risco baixo) a 10 (risco alto).
              </p>
            </div>
            
            {/* Informação de atualização */}
            <p className="text-xs text-zinc-500 mt-auto italic text-center">
              Última atualização: {new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
      
          {/* Seção do Mapa */}
          <div className="flex-1 rounded-lg overflow-hidden shadow-xl border border-zinc-800 min-h-[600px] h-full">
            {isClient ? (
              <DynamicMap
                points={dataPoints}
                onMapClick={handleMapClick}
                onRemovePoint={handleRemovePoint}
                centerCoords={mapCenter}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[600px] bg-zinc-900/80 backdrop-blur-sm text-zinc-400 text-lg">
                <p>Carregando mapa...</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
      
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div className="bg-zinc-900/80 backdrop-blur-sm p-8 rounded-lg w-full max-w-lg relative shadow-xl border border-zinc-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white text-xl hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-zinc-800"
            >
              <X size={24} />
            </button>
            <h3 className="mb-6 text-2xl font-bold text-white">
              Importar JSON + Imagens
            </h3>
            <div className="mb-6">
              <label
                htmlFor="jsonFileInput"
                className="flex items-center gap-3 mb-3 text-white font-semibold text-lg"
              >
                <FileJson size={24} className="text-indigo-400" />
                Arquivo JSON
              </label>
              <input
                id="jsonFileInput"
                type="file"
                accept=".json"
                onChange={handleJsonChange}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 p-3 cursor-pointer transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3 text-white font-semibold text-lg">
                <Upload size={24} className="text-green-400" />
                Imagens ({imageFiles.length} selecionadas)
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Botão de Substituir Imagens */}
                <label
                  htmlFor="replaceImageInput"
                  className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-300 transition duration-200 hover:bg-zinc-700 hover:text-white"
                >
                  <RefreshCcw size={20} className="text-blue-400" />
                  Escolher Imagens
                  <input
                    id="replaceImageInput"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReplaceImagesChange}
                    className="hidden"
                  />
                </label>
                {/* Botão de Adicionar Imagens */}
                <label
                  htmlFor="addImageInput"
                  className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-green-600 bg-green-700 p-3 text-white transition duration-200 hover:bg-green-800"
                >
                  <Plus size={20} />
                  Adicionar Imagens
                  <input
                    id="addImageInput"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddImagesChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {jsonFile && imageFiles.length > 0 && importWarnings.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-red-900/50 text-red-200 text-sm max-h-40 overflow-auto border border-red-800">
                {importWarnings.map((msg, idx) => (
                  <p key={idx}>{msg}</p>
                ))}
              </div>
            )}
            <details className="mb-6 bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 text-sm text-zinc-300 border border-zinc-700">
              <summary className="cursor-pointer font-bold text-base mb-2 text-white flex items-center gap-2">
                <ChevronDown size={20} className="text-zinc-500"/>
                Ver modelo de JSON aceito
              </summary>
              <div className="mt-2 text-zinc-400 space-y-2">
                <p>O arquivo JSON deve ser uma lista com as seguintes chaves:</p>
                <ul className="list-disc list-inside ml-4 text-zinc-400 space-y-1">
                  <li><strong>lat</strong> e <strong>lng</strong>: coordenadas.</li>
                  <li><strong>imageFilename</strong>: nome do arquivo de imagem.</li>
                  <li><strong className="text-yellow-400">intensity</strong> e <strong className="text-yellow-400">detectedObjects</strong>: **opcionais**. A IA vai calculá-los se não estiverem presentes.</li>
                </ul>
                <pre className="whitespace-pre-wrap font-mono bg-zinc-900/50 p-3 rounded-lg border border-zinc-700 overflow-x-auto text-zinc-300 text-xs mt-3">
                  {`[
    {
      "lat": -23.54395455873987,
      "lng": -46.625904487997225,
      "intensity": 9,
      "imageFilename": "img-54.png",
      "detectedObjects": {
        "caixa_agua": 3
      }
    }
  ]`}
                </pre>
              </div>
            </details>
            <button
              onClick={handleImport}
              disabled={!jsonFile || imageFiles.length === 0 || isImporting}
              className={`w-full py-3 rounded-lg text-white font-bold transition-colors duration-200 flex items-center justify-center ${
                (jsonFile && imageFiles.length > 0 && !isImporting)
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Importando...
                </>
              ) : (
                'Importar'
              )}
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