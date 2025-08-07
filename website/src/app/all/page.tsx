"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import * as Slider from "@radix-ui/react-slider";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid
} from "recharts";
import { API_URL } from "@/lib/config";

const HeatMap = dynamic(() => import("../../components/HeatMap"), { ssr: false });

type Point = [number, number, number];
type Forecast = { month: string; reais: number | null; previsto: number };

export default function Dashboard() {
  const [tab, setTab] = useState<"detect"|"map"|"forecast">("detect");

  // --- DETECT ---
  const [images, setImages] = useState<
    { url: string; result?: any; loading: boolean }[]
  >([]);
  const [sliderValue, setSliderValue] = useState([0.5]);
  const [showDetection, setShowDetection] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState(["carro","piscina","caixa_agua"]);

  async function processFiles(files: File[]) {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      setImages(imgs => [...imgs, { url, loading: true }]);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(API_URL + "/detect/", { method: "POST", body: form });
      const result = await res.json();
      setImages(imgs => imgs.map(i => i.url===url ? { url, result, loading:false } : i));
    }
  }

  // --- MAP & UPLOAD INTENSITY ---
  const [points, setPoints] = useState<Point[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedCoords, setSelectedCoords] = useState<[number, number]|null>(null);
  useEffect(() => {
    fetch("/data/points.json")
      .then(r=>r.json())
      .then((data:Point[])=>setPoints(data))
      .catch(()=>{});
  }, []);
  function onMapClick(lat:number,lng:number){
    setSelectedCoords([lat,lng]);
    fileRef.current?.click();
  }
  async function onFile(e:React.ChangeEvent<HTMLInputElement>){
    if(!selectedCoords||!e.target.files?.length) return;
    const file = e.target.files[0];
    const form = new FormData(); form.append("file",file);
    const res = await fetch(API_URL + "/detect/",{method:"POST",body:form});
    const data = await res.json();
    const intensity = data.intensity_score ?? 0;
    setPoints(ps=>[...ps,[selectedCoords[0],selectedCoords[1],intensity]]);
    setSelectedCoords(null);
    e.target.value="";
  }

  // --- FORECAST ---
  const baseCoords: [number,number] = [-23.5505,-46.6333];
  const [horizon, setHorizon] = useState(6);
  const [useClimate, setUseClimate] = useState(true);
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [mapForecast, setMapForecast] = useState<Point[]>([]);
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  useEffect(()=>{
    const fc:Forecast[]=[]; const mp:Point[]=[];
    for(let i=0;i<horizon;i++){
      const reais = i<3?50+i*20:null;
      let prev = (reais ?? 90)+i*10;
      if(useClimate) prev *= 1 + Math.sin(i/horizon*Math.PI)/4;
      const previsto = Math.round(prev);
      fc.push({month:months[i],reais,previsto});
      for(let j=0;j<30;j++){
        const d=0.02;
        const lat=+(baseCoords[0]+(Math.random()-0.5)*d).toFixed(6);
        const lng=+(baseCoords[1]+(Math.random()-0.5)*d).toFixed(6);
        const intensity=+(Math.max(0,previsto+(Math.random()-0.5)*20)).toFixed(1);
        mp.push([lat,lng,intensity]);
      }
    }
    setForecast(fc); setMapForecast(mp);
  },[horizon,useClimate]);

  function downloadCSV(){
    const csv = ["Mês,Casos Reais,Previsão"]
      .concat(forecast.map(f=>`${f.month},${f.reais??""},${f.previsto}`))
      .join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="forecast.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col">
      {/* nav */}
      <nav className="bg-zinc-900 px-6 py-3 flex gap-4">
        {["detect","map","forecast"].map(t=>(
          <button
            key={t}
            onClick={()=>setTab(t as any)}
            className={`px-4 py-2 rounded ${tab===t?"bg-green-600":"bg-zinc-800"}`}
          >{t.toUpperCase()}</button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto flex">
        {tab==="detect" && (
          <div className="p-6 flex-1">
            <h2 className="text-2xl mb-4">Identificação por IA</h2>
            <label className="block mb-4 p-6 border-2 border-dashed border-zinc-700 rounded cursor-pointer">
              Arraste ou selecione imagens
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={e=>processFiles(Array.from(e.target.files||[]))} />
            </label>
            <label className="flex items-center gap-2 mb-4">
              <span>Confiança mínima</span>
              <Slider.Root
                className="w-64 h-5"
                min={0} max={1} step={0.01}
                value={sliderValue}
                onValueChange={setSliderValue}
              >
                <Slider.Track className="bg-zinc-700 h-2 rounded">
                  <Slider.Range className="bg-blue-500 h-full rounded"/>
                </Slider.Track>
                <Slider.Thumb className="w-4 h-4 bg-white rounded"/>
              </Slider.Root>
            </label>
            <label className="flex items-center gap-2 mb-6">
              <input type="checkbox" checked={showDetection} onChange={()=>setShowDetection(!showDetection)}/>
              Mostrar confiança
            </label>
            {images.map((img,i)=>(
              <div key={i} className="mb-8">
                <Image src={img.url} alt="" width={600} height={300} className="rounded"/>
                <div className="mt-2 bg-zinc-800 p-4 rounded">
                  {img.loading?"Processando...":(
                    img.result.objetos
                      .filter((o:any)=>o.confidence>=sliderValue[0] && selectedClasses.includes(o.class))
                      .map((o:any,j)=><div key={j}>{o.class} ({(o.confidence*100).toFixed(1)}%)</div>)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="map" && (
          <div className="p-6 flex-1">
            <h2 className="text-2xl mb-4">Mapa de Calor</h2>
            <div className="h-96 mb-4">
              <HeatMap points={points} onMapClick={onMapClick}/>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={onFile}/>
            <div className="space-x-4">
              <span>Total intensidade: {points.reduce((a,p)=>a+p[2],0)}</span>
              <span>Pontos: {points.length}</span>
            </div>
          </div>
        )}

        {tab==="forecast" && (
          <div className="p-6 flex-1 flex flex-col">
            <h2 className="text-2xl mb-4">Previsão de Picos</h2>
            <div className="flex items-center gap-4 mb-4">
              <div>
                Horizonte: {horizon} meses
                <Slider.Root className="w-48 h-5" min={1} max={12} step={1}
                  value={[horizon]} onValueChange={v=>setHorizon(v[0])}>
                  <Slider.Track className="bg-zinc-700 h-2 rounded">
                    <Slider.Range className="bg-green-500 h-full rounded"/>
                  </Slider.Track>
                  <Slider.Thumb className="w-4 h-4 bg-white rounded"/>
                </Slider.Root>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={useClimate} onChange={()=>setUseClimate(!useClimate)}/>
                Incluir clima
              </label>
              <button onClick={downloadCSV} className="bg-green-600 px-3 py-1 rounded">CSV</button>
            </div>
            <div className="bg-zinc-900 p-4 rounded mb-6 flex-1">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={forecast}>
                  <CartesianGrid stroke="#444" strokeDasharray="3 3"/>
                  <XAxis dataKey="month" stroke="#888"/>
                  <YAxis stroke="#888"/>
                  <Tooltip/>
                  <Legend/>
                  <Line type="monotone" dataKey="reais" stroke="#3b82f6" name="Reais" connectNulls/>
                  <Line type="monotone" dataKey="previsto" stroke="#f43f5e" strokeDasharray="5 5" name="Previsto"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-zinc-900 p-4 rounded flex-1">
              <HeatMap points={mapForecast} onMapClick={()=>{}}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
