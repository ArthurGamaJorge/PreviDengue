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
  Legend
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
  // Ajuste para garantir que a previsão comece no mês seguinte,
  // mesmo que o último mês do dataset seja "Dez"
  const lastMonthIndex = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].indexOf(lastDataPoint.month);
  
  // Gerar dados de previsão
  const predictionMonthsCount = Math.ceil(predictionWeeks / 4); // Aproximadamente 4 semanas por mês
  const futureMonthsNames = getFutureMonths((lastMonthIndex + 1), predictionMonthsCount);

  // Criar a série de dados de previsão com uma chave diferente
  const predictionData: { month: string; cases: null; predicted_cases: number }[] = [];
  let lastPredictionValue = lastDataPoint.cases;
  for (let i = 0; i < futureMonthsNames.length; i++) {
    // Exemplo simples: a previsão aumenta ou diminui um pouco
    const predictedCases = lastPredictionValue + (Math.random() - 0.5) * (lastPredictionValue * 0.2); // Variação de +-20%
    lastPredictionValue = Math.max(0, Math.round(predictedCases));
    
    predictionData.push({
      month: futureMonthsNames[i],
      cases: null, // Deixa os dados reais como nulos para a previsão
      predicted_cases: lastPredictionValue,
    });
  }

  // Combinar dados históricos e de previsão
  // A última data real terá o valor real e será o ponto inicial da previsão
  const combinedData = [
    ...data.map(d => ({ ...d, predicted_cases: null })),
    { ...lastDataPoint, predicted_cases: lastDataPoint.cases, cases: lastDataPoint.cases },
    ...predictionData,
  ];

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
        <Legend />

        {/* Linha principal azul para dados históricos */}
        <Line
          type="monotone"
          dataKey="cases"
          name="Casos Reais"
          stroke="#4299e1" // Cor azul para a linha principal
          strokeWidth={2}
          dot={true}
        />

        {/* Linha de previsão vermelha */}
        {predictionData.length > 0 && (
          <Line
            type="monotone"
            dataKey="predicted_cases"
            name="Previsão"
            stroke="#ef4444" // Cor vermelha para a previsão
            strokeDasharray="5 5" // Linha tracejada para a previsão
            strokeWidth={2}
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SimpleLineChart;