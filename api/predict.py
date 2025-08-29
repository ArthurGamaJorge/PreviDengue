import os
import numpy as np
import pandas as pd
import joblib
import warnings
from pathlib import Path
from datetime import timedelta
import tensorflow as tf
import matplotlib.pyplot as plt
import base64
from io import BytesIO
from huggingface_hub import hf_hub_download 

warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-darkgrid')

# --- MUDANÇA: Definição da loss customizada necessária para carregar o modelo ---
def asymmetric_mse(y_true, y_pred):
    penalty_factor = 5.0
    error = y_true - y_pred
    penalty = tf.where(error > 0, penalty_factor, 1.0)
    loss = tf.square(error) * penalty
    return tf.reduce_mean(loss)

class DenguePredictor:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parent
        # --- MUDANÇA: Constantes do modelo alinhadas com o treinamento final ---
        self.sequence_length = 12
        self.horizon = 8
        self.year_min_train = 2014
        self.year_max_train = 2025
        self.dynamic_features = [
            "numero_casos", "casos_velocidade", "casos_aceleracao", "casos_mm_4_semanas",
            "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN",
            "week_sin", "week_cos", "year_norm"
        ]
        self.static_features = ["latitude", "longitude"]
        self.feature_names_pt = {
            "numero_casos": "Nº de Casos de Dengue", "T2M": "Temperatura Média (°C)",
            "PRECTOTCORR": "Precipitação (mm)"
        }
        self.load_assets()

    def load_assets(self):
        print("INFO: Carregando todos os ativos da IA (modelo, scalers, dados)...")
        AI_ASSETS_DIR = self.project_root / "models"
        
        # --- MUDANÇA: Baixa o arquivo do Hugging Face para o caminho local ---
        INFERENCE_PATH = hf_hub_download(
            repo_id='previdengue/predict_inference_data', 
            filename='inference_data.parquet', 
            repo_type='dataset',
            token=os.environ.get('HF_TOKEN') # Autenticação com o token de acesso
        )
        
        SCALER_DIR = AI_ASSETS_DIR / "scalers"
        MODEL_PATH = AI_ASSETS_DIR / "checkpoints" / "model_checkpoint_best_city.keras"

        # --- MUDANÇA: Carregamento dos scalers GLOBAIS ---
        self.scaler_dyn = joblib.load(SCALER_DIR / "scaler_dyn_global.pkl")
        self.scaler_static = joblib.load(SCALER_DIR / "scaler_static_global.pkl")
        self.scaler_target = joblib.load(SCALER_DIR / "scaler_target_global.pkl")

        # Lê os dados de inferência do arquivo baixado
        df_master = pd.read_parquet(INFERENCE_PATH)
        df_master['codigo_ibge'] = df_master['codigo_ibge'].astype(int)
        df_master['date'] = pd.to_datetime(df_master['ano'].astype(str) + df_master['semana'].astype(str) + '0', format='%Y%W%w', errors='coerce')
        df_master = df_master.sort_values(by=['codigo_ibge', 'date']).reset_index(drop=True)
        self.df_master = df_master
        self.municipios = df_master[['codigo_ibge', 'municipio']].drop_duplicates().sort_values('codigo_ibge')

        # --- MUDANÇA: Carregamento do modelo com a loss customizada ---
        self.model = tf.keras.models.load_model(MODEL_PATH, custom_objects={'asymmetric_mse': asymmetric_mse})
        print("INFO: Ativos da IA carregados com sucesso.")

    def plot_to_base64(self, fig):
        buf = BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor='#18181b')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_str

    def predict(self, ibge_code: int):
        df_mun = self.df_master[self.df_master['codigo_ibge'] == ibge_code].copy()
        if df_mun.empty or len(df_mun) < self.sequence_length:
            raise ValueError(f"Não há dados ou histórico suficiente para o município {ibge_code}")

        municipio_name = self.municipios[self.municipios['codigo_ibge'] == ibge_code].iloc[0]['municipio']

        # 1. Pega a última sequência de dados históricos completos
        last_complete_sequence = df_mun.dropna(subset=['numero_casos']).tail(self.sequence_length).copy()
        if len(last_complete_sequence) < self.sequence_length:
            raise ValueError(f"Histórico insuficiente de casos conhecidos para {ibge_code}")

        # 2. Engenharia de Features na sequência de entrada
        last_complete_sequence['casos_velocidade'] = last_complete_sequence['numero_casos'].diff().fillna(0)
        last_complete_sequence['casos_aceleracao'] = last_complete_sequence['casos_velocidade'].diff().fillna(0)
        last_complete_sequence['casos_mm_4_semanas'] = last_complete_sequence['numero_casos'].rolling(4, min_periods=1).mean()
        last_complete_sequence['week_sin'] = np.sin(2 * np.pi * last_complete_sequence['semana'] / 52)
        last_complete_sequence['week_cos'] = np.cos(2 * np.pi * last_complete_sequence['semana'] / 52)
        last_complete_sequence['year_norm'] = (last_complete_sequence['ano'] - self.year_min_train) / (self.year_max_train - self.year_min_train)

        # 3. Prepara os dados de entrada para o modelo
        dynamic_input_raw = last_complete_sequence[self.dynamic_features].values
        static_input_raw = last_complete_sequence[self.static_features].iloc[-1].values.reshape(1, -1)
        
        dynamic_input_scaled = self.scaler_dyn.transform(dynamic_input_raw).reshape(1, self.sequence_length, -1)
        static_input_scaled = self.scaler_static.transform(static_input_raw)

        # 4. Faz a predição (tiro único)
        predictions_scaled = self.model.predict([dynamic_input_scaled, static_input_scaled], verbose=0)
        pred_casos_scaled = predictions_scaled[0] # Primeira saída do modelo

        # 5. Inverte a transformação para obter o número de casos reais
        pred_casos_log = self.scaler_target.inverse_transform(pred_casos_scaled.reshape(1, -1))
        pred_casos_real = np.expm1(pred_casos_log).flatten()
        
        predictions_final = [max(0, round(case)) for case in pred_casos_real]

        # 6. Formata a resposta
        last_real_date = last_complete_sequence['date'].iloc[-1]
        predicted_data = [{
            "date": (last_real_date + timedelta(weeks=i + 1)).strftime('%Y-%m-%d'),
            "predicted_cases": cases
        } for i, cases in enumerate(predictions_final)]

        historic_data = [{
            "date": row['date'].strftime('%Y-%m-%d'),
            "cases": int(row["numero_casos"]) if pd.notna(row["numero_casos"]) else None
        } for _, row in df_mun.tail(52).iterrows()]

        # Geração de insights (Análise de Lag)
        lag_plot_b64, strategic_summary, tipping_points = self.generate_lag_insights(df_mun)

        return {
            "municipality_name": municipio_name,
            "historic_data": historic_data,
            "predicted_data": predicted_data,
            "insights": {
                "lag_analysis_plot_base64": lag_plot_b64,
                "strategic_summary": strategic_summary,
                "tipping_points": tipping_points
            }
        }
    
    def generate_lag_insights(self, df_mun):
        # Renomeia as colunas para a análise e para os gráficos
        df_analysis = df_mun.rename(columns={"T2M": "Temperatura Média (°C)", "PRECTOTCORR": "Precipitação (mm)"})
        max_lag = 12
        cases_col_name = 'numero_casos'
        lag_features = ['Temperatura Média (°C)', 'Precipitação (mm)']
        lag_correlations = {}

        # Calcula a correlação para cada feature com diferentes defasagens (lags)
        for col in lag_features:
            # Garante que a coluna existe antes de tentar usá-la
            if col in df_analysis.columns:
                corrs = [df_analysis[cases_col_name].corr(df_analysis[col].shift(lag)) for lag in range(1, max_lag + 1)]
                lag_correlations[col] = corrs
        
        # Cria a figura para o gráfico
        fig, ax = plt.subplots(figsize=(10, 6), facecolor='#18181b')
        ax.set_facecolor('#18181b')
        
        # Plota as correlações
        for feature_name, corrs in lag_correlations.items():
            ax.plot(range(1, max_lag + 1), corrs, marker='o', linestyle='-', label=feature_name)
        
        # Estiliza o gráfico
        ax.set_title('Análise de Defasagem (Lag)', color='white')
        ax.set_xlabel('Defasagem (Semanas)', color='white')
        ax.set_ylabel('Correlação com Casos', color='white')
        ax.tick_params(colors='white')
        ax.legend(facecolor='#27272a', edgecolor='gray', labelcolor='white')
        ax.grid(True, which='both', linestyle='--', linewidth=0.5, color='#444')
        
        # Converte o gráfico para base64 para enviar na resposta da API
        lag_plot_b64 = self.plot_to_base64(fig)

        # Encontra o pico de correlação para cada feature
        lag_peaks = {
            feature: (np.argmax(np.abs(corrs)) + 1) if corrs and not all(pd.isna(corrs)) else 'N/A' 
            for feature, corrs in lag_correlations.items()
        }
        temp_lag = lag_peaks.get('Temperatura Média (°C)', 'N/A')
        rain_lag = lag_peaks.get('Precipitação (mm)', 'N/A')

        # Cria um resumo estratégico
        summary = (
            f"A IA identifica a **Temperatura** e a **Precipitação** como os principais gatilhos climáticos. "
            f"O impacto da temperatura tende a ser máximo após **{temp_lag} semanas**, enquanto o da chuva ocorre após **{rain_lag} semanas**. "
            "Ações preventivas devem ser intensificadas nesta janela após eventos climáticos extremos."
        )
        
        # Cria os pontos-chave (tipping points)
        tipping_points = [
            {"factor": "Temperatura", "value": f"Impacto máximo em {temp_lag} semanas"},
            {"factor": "Precipitação", "value": f"Impacto máximo em {rain_lag} semanas"},
            {"factor": "Umidade", "value": "Aumenta a sobrevida do mosquito adulto"},
        ]
        
        return lag_plot_b64, summary, tipping_points
