"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { API_URL } from "@/lib/config";

interface HistoricData { date: string; cases: number | null; }
interface PredictedData { date: string; predicted_cases: number; }
interface ApiStateData {
  state: string;
  historic_data: HistoricData[];
  predicted_data: PredictedData[];
}

const STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

interface ChartPoint { date: string; 'Casos Reais': number | null; 'Previsão da IA': number | null; }

const StateChartSection = () => {
  const [selectedState, setSelectedState] = useState<string>("SP");
  const [apiData, setApiData] = useState<ApiStateData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const weeksToDisplay = 6; // fixo
  const [historyWeeks, setHistoryWeeks] = useState<number>(52);

  useEffect(() => {
    const fetchState = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`${API_URL}/predict/state/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: selectedState })
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data: ApiStateData = await res.json();
        setApiData(data);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    fetchState();
  }, [selectedState]);

  const chartData = useMemo(() => {
    if (!apiData) return [];
    const historic = (apiData.historic_data || []).filter(d => d.cases !== null);
    const limitedHistoric = historic.slice(-historyWeeks);
    const histPoints: ChartPoint[] = limitedHistoric.map(d => ({
      date: d.date,
      'Casos Reais': d.cases,
      'Previsão da IA': null
    }));
    const preds = (apiData.predicted_data || []).slice(0, weeksToDisplay).map(d => ({
      date: d.date,
      'Casos Reais': null,
      'Previsão da IA': d.predicted_cases
    }));
    if (histPoints.length) {
      const last = histPoints[histPoints.length - 1];
      if (last['Previsão da IA'] == null) {
        last['Previsão da IA'] = (last['Casos Reais'] ?? 0) as number;
      }
    }
    return [...histPoints, ...preds];
  }, [apiData, historyWeeks]);

  // Ticks de mês únicos e ano em negrito (janeiro)
  const monthTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const pt of chartData) {
      const d = new Date(pt.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!seen.has(key)) {
        seen.add(key);
        ticks.push(pt.date);
      }
    }
    return ticks;
  }, [chartData]);

  const CustomMonthYearTick = (props: any) => {
    const { x, y, payload } = props;
    const d = new Date(payload.value);
    if (isNaN(d.getTime())) return null;
    const isJanuary = d.getMonth() === 0;
    const text = isJanuary ? String(d.getFullYear()) : d.toLocaleString('pt-BR', { month: 'short' });
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={16} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight={isJanuary ? 700 : 400}>
          {text}
        </text>
      </g>
    );
  };

  const yearTicks = useMemo(() => {
    const firstByYear = new Map<number, string>();
    for (const pt of chartData) {
      const d = new Date(pt.date);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      if (!firstByYear.has(y)) firstByYear.set(y, pt.date);
    }
    return Array.from(firstByYear.values());
  }, [chartData]);

  const YearTick = ({ x, y, payload }: any) => {
    const d = new Date(payload.value);
    if (isNaN(d.getTime())) return null;
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={-4} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight={700}>
          {String(d.getFullYear())}
        </text>
      </g>
    );
  };

  // Formatação de ticks: mês curto e ano no início do ano
  const monthTickFormatter = (value: string) => {
    const dt = new Date(value);
    const month = dt.getMonth();
    return month === 0 ? dt.getFullYear().toString() : dt.toLocaleString('pt-BR', { month: 'short' });
  };

  // Semana ISO e tooltip customizado
  const isoWeekNumber = (date: Date) => {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1) / 7);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = new Date(payload[0].payload.date);
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      const week = isoWeekNumber(d);
      const rangeStr = `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
      const real = payload.find((p: any) => p.dataKey === 'Casos Reais')?.value ?? null;
      const pred = payload.find((p: any) => p.dataKey === 'Previsão da IA')?.value ?? null;
      return (
        <div style={{ background: 'rgba(17,24,39,0.9)', border: '1px solid #374151', padding: 8, borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{`Semana ${week}: ${rangeStr}`}</div>
          {real !== null && <div style={{ color: '#22c55e' }}>Casos Reais: {real}</div>}
          {pred !== null && <div style={{ color: '#f59e0b' }}>Previsão da IA: {pred}</div>}
        </div>
      );
    }
    return null;
  };

  const yearMarkers = useMemo(() => {
    const markers: { date: string; year: number }[] = [];
    const seen = new Set<number>();
    for (const pt of chartData) {
      const dt = new Date(pt.date);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        if (!seen.has(y)) {
          seen.add(y);
          markers.push({ date: pt.date, year: y });
        }
      }
    }
    return markers;
  }, [chartData]);

  return (
    <div className="mt-6 text-zinc-300 font-sans">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-lg">
        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-white">Previsão Estadual</h3>
          <div className="flex items-center gap-4">
            <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label htmlFor="state-history" className="text-zinc-300 text-sm whitespace-nowrap">Histórico (semanas):</label>
              <input id="state-history" type="range" min="12" max="600" value={historyWeeks} onChange={(e) => setHistoryWeeks(Number(e.target.value))} className="w-40 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <span className="w-20 h-8 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-white text-sm">{historyWeeks}</span>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-[300px] text-zinc-400">Carregando...</div>
          ) : error ? (
            <div className="flex items-center justify-center h-[300px] text-red-400">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData} margin={{ top: 24, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="stateHistoric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="statePrediction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                {yearMarkers.map(m => (
                  <ReferenceLine key={`year-${m.year}`} x={m.date} stroke="#6b7280" strokeDasharray="4 4" label={{ value: String(m.year), position: 'top', fill: '#9ca3af', fontSize: 12, fontWeight: 700 }} />
                ))}
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  ticks={monthTicks}
                  tick={<CustomMonthYearTick />}
                  allowDuplicatedCategory={false}
                />
                <XAxis
                  dataKey="date"
                  xAxisId="year"
                  orientation="top"
                  stroke="#9ca3af"
                  tickLine={false}
                  axisLine={false}
                  ticks={yearTicks}
                  tick={<YearTick />}
                  height={0}
                  allowDuplicatedCategory={false}
                />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Area type="monotone" dataKey="Casos Reais" stroke="#22c55e" fillOpacity={1} fill="url(#stateHistoric)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="Previsão da IA" stroke="#f59e0b" fillOpacity={1} fill="url(#statePrediction)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default StateChartSection;
