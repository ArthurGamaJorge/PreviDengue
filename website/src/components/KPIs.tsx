// components/KPIs.tsx
interface KPIsProps {
    totalCases: number;
    pointCount: number;
    avgIntensity: string;
  }
  
  export default function KPIs({ totalCases, pointCount, avgIntensity }: KPIsProps) {
    return (
      <section className="grid grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto text-white font-sans">
        <div className="bg-zinc-900 rounded-lg p-6 shadow-lg border border-zinc-800 text-center">
          <h3 className="text-4xl font-extrabold">{totalCases}</h3>
          <p className="text-sm text-zinc-400 mt-1">Total de Intensidade</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-6 shadow-lg border border-zinc-800 text-center">
          <h3 className="text-4xl font-extrabold">{pointCount}</h3>
          <p className="text-sm text-zinc-400 mt-1">Total de Pontos</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-6 shadow-lg border border-zinc-800 text-center">
          <h3 className="text-4xl font-extrabold">{avgIntensity}</h3>
          <p className="text-sm text-zinc-400 mt-1">Média Intensidade</p>
        </div>
      </section>
    );
  }
  