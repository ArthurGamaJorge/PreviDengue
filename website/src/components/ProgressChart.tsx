// components/ProgressChart.tsx
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
  } from "recharts";
  
  const chartData = [
    { month: "Jan", AnáliseA: 30, AnáliseB: 20 },
    { month: "Fev", AnáliseA: 45, AnáliseB: 35 },
    { month: "Mar", AnáliseA: 50, AnáliseB: 40 },
    { month: "Abr", AnáliseA: 70, AnáliseB: 55 },
    { month: "Mai", AnáliseA: 90, AnáliseB: 65 },
  ];
  
  export default function ProgressChart() {
    return (
      <section className="bg-zinc-900 rounded-xl p-6 shadow-lg mb-12">
        <h3 className="text-2xl font-bold mb-6">Análise de Progressão Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#444" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip
              contentStyle={{ backgroundColor: "#222", borderRadius: 6, border: "none" }}
              itemStyle={{ color: "#fff" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="AnáliseA"
              stroke="#3b82f6"
              strokeWidth={3}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="AnáliseB"
              stroke="#f97316"
              strokeWidth={3}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>
    );
  }
  