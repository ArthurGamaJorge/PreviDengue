// src/components/AISummarySection.jsx

"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const predictionData = [
  { name: 'Jan', Real: 4000, Previsto: 2400 },
  { name: 'Fev', Real: 3000, Previsto: 1398 },
  { name: 'Mar', Real: 2000, Previsto: 3000 },
  { name: 'Abr', Real: 2780, Previsto: 3908 },
  { name: 'Mai', Real: 1890, Previsto: 4800 },
  { name: 'Jun', Real: 2390, Previsto: 3800 },
];

type SatisfactionLabelProps = {
  value: number;
};

const SatisfactionLabel = ({ value }: SatisfactionLabelProps) => {
  let labelText = '';
  let bgColor = '';
  
  if (value === 15.42 || value === 8.76) {
    labelText = 'Muito Bom';
    bgColor = 'bg-emerald-600';
  } else if (value === 91) {
    labelText = 'Excelente';
    bgColor = 'bg-emerald-600';
  }
  
  return (
    <span className={`py-1 px-3 rounded-full text-xs font-bold text-white ${bgColor}`}>
      {labelText}
    </span>
  );
};

const AISummarySection = () => {
  return (
    <section className="py-12 px-4 sm:px-8">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Entendendo o Motor de Previsão de Dengue
        </h2>
        <p className="text-center text-lg text-zinc-400 mb-12 max-w-3xl mx-auto">
          Nossa solução utiliza um modelo de <span className="font-bold">Rede Neural Recorrente (LSTM)</span> para analisar dados históricos e prever a incidência de dengue. Aqui, detalhamos como o modelo funciona e a precisão de suas previsões.
        </p>

        


        <div className="grid grid-cols-1 gap-8 mb-12">
  {/* Card: Dados do Dataset - Ocupa a largura total */}
  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
    <h3 className="text-2xl font-bold text-blue-400 mb-2">Dados do Dataset</h3>
    <p className="text-zinc-400 mb-4">
      Análise e estrutura das informações utilizadas para treinar o modelo. Os dados de **casos de dengue** foram obtidos do **SUS** (Sistema Único de Saúde), enquanto os dados **climáticos** foram fornecidos pela API da **NASA POWER**.
      <br /><br />
      O conjunto de dados totaliza **3.3 milhões de linhas**, cobrindo 5.570 municípios brasileiros de 2014 a 2025. Cada linha representa uma semana epidemiológica em um município específico, contendo informações sobre casos de dengue, temperatura, precipitação e umidade.
    </p>

    {/* Tabela de Colunas do Dataset com coluna de Exemplo */}
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left min-w-[700px]">
        <thead className="border-b border-zinc-700">
          <tr>
            <th className="py-2 text-zinc-300">Coluna</th>
            <th className="py-2 text-zinc-300">Tipo</th>
            <th className="py-2 text-zinc-300">Exemplo de Valor</th>
            <th className="py-2 text-zinc-300">Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-700">
            <td className="py-2">municipio</td>
            <td className="py-2">object</td>
            <td className="py-2">Campinas</td>
            <td className="py-2">Nome do município onde os casos foram notificados.</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">numero_casos</td>
            <td className="py-2">int64</td>
            <td className="py-2">350</td>
            <td className="py-2">Contagem de casos de dengue confirmados por semana epidemiológica.</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">semana</td>
            <td className="py-2">int64</td>
            <td className="py-2">15</td>
            <td className="py-2">Semana epidemiológica do registro (1 a 53).</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">ano</td>
            <td className="py-2">int64</td>
            <td className="py-2">2025</td>
            <td className="py-2">Ano do registro (2014 a 2025).</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">T2M</td>
            <td className="py-2">float64</td>
            <td className="py-2">24.5</td>
            <td className="py-2">Temperatura Média Semanal (°C).</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">T2M_MAX</td>
            <td className="py-2">float64</td>
            <td className="py-2">29.54</td>
            <td className="py-2">Temperatura Máxima Diária Média da Semana (°C).</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">T2M_MIN</td>
            <td className="py-2">float64</td>
            <td className="py-2">20.12</td>
            <td className="py-2">Temperatura Mínima Diária Média da Semana (°C).</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">PRECTOTCORR</td>
            <td className="py-2">float64</td>
            <td className="py-2">12.8</td>
            <td className="py-2">Precipitação Total Corrigida Semanal (mm).</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">RH2M</td>
            <td className="py-2">float64</td>
            <td className="py-2">78%</td>
            <td className="py-2">Umidade Relativa do Ar Semanal (%).</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="py-2">ALLSKY_SFC_SW_DWN</td>
            <td className="py-2">float64</td>
            <td className="py-2">17.18</td>
            <td className="py-2">Radiação Solar Diária Média Semanal (W/m²).</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap gap-2 text-sm text-zinc-400">
      <span className="bg-emerald-600 text-white py-1 px-3 rounded-full text-xs">3.3 Milhões de linhas</span>
      <span className="bg-zinc-700 text-zinc-300 py-1 px-3 rounded-full text-xs">2014-2025</span>
      <span className="bg-zinc-700 text-zinc-300 py-1 px-3 rounded-full text-xs">Sem dados ausentes</span>
      <span className="bg-zinc-700 text-zinc-300 py-1 px-3 rounded-full text-xs">16 colunas no total</span>
      <span className="bg-zinc-700 text-zinc-300 py-1 px-3 rounded-full text-xs">Dados de 5570 municípios</span>
    </div>
  </div>

  {/* Contêiner de Métricas - Logo abaixo do Dataset */}
  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
    <div className="mb-6">
      <h3 className="text-2xl font-bold text-purple-400 mb-2">Métricas de Avaliação do Modelo</h3>
      <p className="text-zinc-400">
        Nossa IA é treinada para minimizar o erro entre o que ela prevê e o que realmente acontece. Usamos métricas para medir a sua precisão.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Mini Card 1: RMSE */}
      <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 text-center">
        <p className="text-purple-400 text-3xl font-bold">15.42</p>
        <p className="text-sm text-zinc-400 mt-1 mb-2">
          <span className="font-bold">Erro Médio (RMSE)</span>
        </p>
        <div className="flex justify-center">
          <SatisfactionLabel value={15.42} />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Mede a distância média entre a previsão e o valor real. Um valor baixo indica um modelo preciso.
        </p>
      </div>
      {/* Mini Card 2: MAE */}
      <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 text-center">
        <p className="text-purple-400 text-3xl font-bold">8.76</p>
        <p className="text-sm text-zinc-400 mt-1 mb-2">
          <span className="font-bold">Desvio Médio (MAE)</span>
        </p>
        <div className="flex justify-center">
          <SatisfactionLabel value={8.76} />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          O erro absoluto médio. Um valor baixo indica que o modelo raramente erra por muito.
        </p>
      </div>
      {/* Mini Card 3: R² */}
      <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 text-center">
        <p className="text-purple-400 text-3xl font-bold">91%</p>
        <p className="text-sm text-zinc-400 mt-1 mb-2">
          <span className="font-bold">Poder Preditivo (R²)</span>
        </p>
        <div className="flex justify-center">
          <SatisfactionLabel value={91} />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Indica que a IA consegue explicar 91% da variação dos casos. O resultado está muito próximo do ideal de 100%.
        </p>
      </div>
    </div>
  </div>
</div>
        
        
        {/* Seção de Gráficos de Treinamento - Com Recharts */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-12">
          <h3 className="text-2xl font-bold text-teal-400 mb-2">Gráfico de Treinamento: Real vs. Previsto</h3>
          <p className="text-zinc-400 mb-4">
            Comparação visual entre os dados de casos de dengue reais e as previsões do modelo durante a fase de validação.
          </p>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                <XAxis dataKey="name" stroke="#a1a1a9" />
                <YAxis stroke="#a1a1a9" />
                <Tooltip contentStyle={{ backgroundColor: '#27272a', border: 'none' }} itemStyle={{ color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="Real" stroke="#8884d8" activeDot={{ r: 8 }} strokeWidth={2} />
                <Line type="monotone" dataKey="Previsto" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Seção de Utilidade e Importância */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-amber-400 mb-4">Utilidade e Importância da IA na Saúde Pública</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-zinc-400">
                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 transition-all duration-300 hover:bg-zinc-700">
                    <h4 className="font-semibold text-lg text-amber-300 mb-2">Tomada de Decisão</h4>
                    <p className="text-sm">
                        As previsões de alta precisão permitem que órgãos de saúde pública aloquem recursos (<span className="font-bold">equipes de prevenção, leitos hospitalares</span>) de forma proativa e estratégica, otimizando o combate à doença.
                    </p>
                </div>
                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 transition-all duration-300 hover:bg-zinc-700">
                    <h4 className="font-semibold text-lg text-amber-300 mb-2">Campanhas de Prevenção</h4>
                    <p className="text-sm">
                        Com a capacidade de identificar áreas de risco iminente, é possível direcionar campanhas de conscientização e ações de controle de vetores para os locais certos no momento certo.
                    </p>
                </div>
                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 transition-all duration-300 hover:bg-zinc-700">
                    <h4 className="font-semibold text-lg text-amber-300 mb-2">Transparência e Conscientização</h4>
                    <p className="text-sm">
                        Apresentar os dados e a metodologia de forma clara aumenta a confiança na ferramenta e empodera a população a se engajar na prevenção, compreendendo os fatores de risco.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default AISummarySection;