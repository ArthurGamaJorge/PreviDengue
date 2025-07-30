// components/LineChart.tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';

interface ChartData {
  month: string;
  cases: number;
}

interface LineChartProps {
  data: ChartData[];
  predictionWeeks: number; // Número de semanas para previsão
}

// Helper para gerar nomes de meses futuros (simplesmente "Mês X")
const getFutureMonths = (startMonthIndex: number, count: number): string[] => {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const futureMonths: string[] = [];
  for (let i = 0; i < count; i++) {
    futureMonths.push(months[(startMonthIndex + i) % 12]);
  }
  return futureMonths;
};

const SimpleLineChart: React.FC<LineChartProps> = ({ data, predictionWeeks }) => {
  if (!data || data.length === 0) {
    return <p className="text-zinc-400 text-center py-8">Nenhum dado disponível para o gráfico.</p>;
  }

  // Encontrar o último mês e o número de casos para iniciar a previsão
  const lastDataPoint = data[data.length - 1];
  const lastMonthIndex = new Date(`2000-${lastDataPoint.month}-01`).getMonth(); // Pega o índice do mês
  const lastMonthValue = lastDataPoint.cases;

  // Gerar dados de previsão
  const predictionData: ChartData[] = [];
  const startMonthForPrediction = (lastMonthIndex + 1) % 12; // Mês seguinte ao último dado
  const futureMonthsNames = getFutureMonths(startMonthForPrediction, Math.ceil(predictionWeeks / 4)); // Aproximadamente 4 semanas por mês

  for (let i = 0; i < futureMonthsNames.length; i++) {
    // Exemplo simples: a previsão aumenta ou diminui um pouco
    const predictedCases = lastMonthValue + (Math.random() - 0.5) * (lastMonthValue * 0.2); // Variação de +-20%
    predictionData.push({ month: futureMonthsNames[i], cases: Math.max(0, Math.round(predictedCases)) });
  }

  // Combinar dados históricos e de previsão para o gráfico
  const combinedData = [...data, ...predictionData];

  // Identificar onde começa a área de previsão
  const predictionStartIndex = data.length -1;
  const predictionEndXIndex = combinedData.length -1;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={combinedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="month" stroke="#999" />
        <YAxis stroke="#999" />
        <Tooltip
          contentStyle={{ backgroundColor: '#222', border: '1px solid #555', borderRadius: '4px' }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ color: '#888' }}
        />

        {/* Linha principal azul para dados históricos */}
        <Line
          type="monotone"
          dataKey="cases"
          stroke="#4299e1" // Cor azul para a linha principal
          strokeWidth={2}
          dot={true}
          // Limita a linha azul apenas aos dados históricos
          data={data}
        />

        {/* Linha de previsão vermelha */}
        {predictionData.length > 0 && (
          <Line
            type="monotone"
            dataKey="cases"
            stroke="#ef4444" // Cor vermelha para a previsão
            strokeDasharray="5 5" // Linha tracejada para a previsão
            strokeWidth={2}
            dot={false}
            data={combinedData.slice(predictionStartIndex)} // Começa do último ponto histórico
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SimpleLineChart;