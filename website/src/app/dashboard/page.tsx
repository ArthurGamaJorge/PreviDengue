"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
<<<<<<< HEAD
import MapSection from "@/components/MapSection";
import ChartSection from "@/components/ChartSection";

export default function Home() {
=======
import SimpleLineChart from "@/components/LineChart"; // <-- Adição aqui
import { API_URL } from "@/lib/config";

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
  const [jsonImageFilenames, setJsonImageFilenames] = useState<Set<string>>(
    new Set()
  );
  const [imageFileNames, setImageFileNames] = useState<Set<string>>(new Set());
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // --- Adições para o Gráfico de Linhas ---
  const [selectedCity, setSelectedCity] = useState("Campinas");
  const [predictionWeeks, setPredictionWeeks] = useState(12); // Padrão de 12 semanas

  // Dados de exemplo para diferentes cidades
  const chartData = {
    Campinas: [
      { month: "Jan", cases: 200 },
      { month: "Fev", cases: 220 },
      { month: "Mar", cases: 280 },
      { month: "Abr", cases: 250 },
      { month: "Mai", cases: 180 },
      { month: "Jun", cases: 150 },
      { month: "Jul", cases: 130 },
      { month: "Ago", cases: 160 },
      { month: "Set", cases: 210 },
      { month: "Out", cases: 270 },
      { month: "Nov", cases: 300 },
      { month: "Dez", cases: 260 },
    ],
    SãoPaulo: [
      { month: "Jan", cases: 800 },
      { month: "Fev", cases: 950 },
      { month: "Mar", cases: 1100 },
      { month: "Abr", cases: 1000 },
      { month: "Mai", cases: 700 },
      { month: "Jun", cases: 600 },
      { month: "Jul", cases: 550 },
      { month: "Ago", cases: 680 },
      { month: "Set", cases: 850 },
      { month: "Out", cases: 1050 },
      { month: "Nov", cases: 1200 },
      { month: "Dez", cases: 980 },
    ],
    RioDeJaneiro: [
      { month: "Jan", cases: 500 },
      { month: "Fev", cases: 620 },
      { month: "Mar", cases: 750 },
      { month: "Abr", cases: 680 },
      { month: "Mai", cases: 450 },
      { month: "Jun", cases: 300 },
      { month: "Jul", cases: 280 },
      { month: "Ago", cases: 350 },
      { month: "Set", cases: 480 },
      { month: "Out", cases: 600 },
      { month: "Nov", cases: 720 },
      { month: "Dez", cases: 590 },
    ],
  };

  const handleCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
  };

  const handleWeeksChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPredictionWeeks(isNaN(value) ? 0 : value);
  };
  // --- Fim das Adições para o Gráfico de Linhas ---

  const totalIntensity = dataPoints.reduce((sum, p) => sum + p.intensity, 0);
  const averageIntensity =
    dataPoints.length > 0
      ? (totalIntensity / dataPoints.length).toFixed(2)
      : "0.00";

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

      const res = await fetch(API_URL + "/detect/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Erro no backend");

      const data = await res.json(); // Ex: { intensity_score: 6.4, counts: { carro: 2, piscina: 1 } }

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
      warnings.push(
        `Faltando imagens para o JSON: ${missingImages.join(", ")}`
      );
    }
    if (extraImages.length > 0) {
      warnings.push(
        `Imagens selecionadas que não constam no JSON: ${extraImages.join(
          ", "
        )}`
      );
    }
    setImportWarnings(warnings);
  }

  // No onChange do input JSON:
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

        const filenames = new Set(
          data.map((point) => point.imageFilename).filter(Boolean) as string[]
        );
        setJsonImageFilenames(filenames);
        validateImageJsonMatch(filenames, imageFileNames);
      } catch {
        setJsonImageFilenames(new Set());
        setImportWarnings(["JSON inválido"]);
      }
    };
    reader.readAsText(file);
  };

  // No onChange do input de imagens:
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
          const importedData = JSON.parse(
            reader.result as string
          ) as DataPoint[];
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

            // Se faltar alguma das duas infos, faz a chamada à API
            if (
              !detectedObjects ||
              intensity === null ||
              intensity === undefined
            ) {
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

>>>>>>> 1a4a7c995c347bd1cafdcba0b38fa79c4694726d
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-white pt-20 px-4 sm:px-8">
      <Header />
      
      <MapSection />
      
      <ChartSection />
      
      <Footer />
    </main>
  );
}