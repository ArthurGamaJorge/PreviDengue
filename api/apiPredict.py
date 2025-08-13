# uvicorn apiPredict:app --reload

import os
import numpy as np
import pandas as pd
import joblib
import warnings
from pathlib import Path
from datetime import datetime, timedelta

# Libs da API
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Libs de IA e Gráficos
import tensorflow as tf
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from io import BytesIO

# --- Configurações Iniciais ---
warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-darkgrid')

# --- Estrutura da API ---
app = FastAPI(
    title="API Preditiva de Dengue",
    description="Utiliza um modelo LSTM para prever casos de dengue e gerar análises de risco.",
    version="1.0.0"
)

# Configuração de CORS para permitir que o front-end React acesse a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restrinja para o domínio do seu front-end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Carregamento de Ativos (Modelo, Dados, Scalers) ---
# Otimização: Carregar os ativos pesados apenas uma vez no início.
@app.on_event("startup")
def load_assets():
    global df_master, municipios, model, FEATURE_NAMES_PT, SEQUENCE_LENGTH
    
    # --- Lógica de Caminhos Relativos ---
    # O script da API está em /api/main.py
    # Os ativos estão em /ai_predict/lstm_test_1/ e /data/
    API_DIR = Path(__file__).resolve().parent
    PROJECT_ROOT = API_DIR.parent 
    AI_ASSETS_DIR = PROJECT_ROOT / "ai_predict" / "lstm_test_1"
    
    DATA_PATH = PROJECT_ROOT / "data" / "final_training_data.parquet"
    MODEL_PATH = AI_ASSETS_DIR / "checkpoints" / "model_checkpoint_best.keras"
    SCALER_DIR = AI_ASSETS_DIR / "scalers"
    
    app.state.SCALER_DIR = SCALER_DIR # Salva o caminho para uso posterior

    print("Carregando ativos da IA...")
    try:
        df_master = pd.read_parquet(DATA_PATH)
        df_master['codigo_ibge'] = df_master['codigo_ibge'].astype(int)
        df_master = df_master.sort_values(by=['codigo_ibge', 'ano', 'semana']).reset_index(drop=True)
        
        municipios = df_master[['codigo_ibge', 'municipio']].drop_duplicates().sort_values('codigo_ibge')
        
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Modelo carregado com sucesso.")

        FEATURE_NAMES_PT = {
            "numero_casos": "Nº de Casos de Dengue", "T2M": "Temperatura Média (°C)",
            "T2M_MAX": "Temperatura Máxima (°C)", "T2M_MIN": "Temperatura Mínima (°C)",
            "PRECTOTCORR": "Precipitação (mm)", "RH2M": "Umidade Relativa (%)",
            "ALLSKY_SFC_SW_DWN": "Radiação Solar (W/m²)"
        }
        SEQUENCE_LENGTH = 12

    except FileNotFoundError as e:
        print(f"ERRO CRÍTICO: Arquivo não encontrado - {e}. Verifique os caminhos.")
        raise RuntimeError(f"Falha ao carregar ativos essenciais: {e}")
    except Exception as e:
        print(f"ERRO CRÍTICO ao carregar ativos: {e}")
        raise RuntimeError(f"Erro inesperado ao carregar ativos: {e}")

# --- Modelos Pydantic para Validação de Requisição/Resposta ---
class PredictionRequest(BaseModel):
    ibge_code: int
    weeks_to_predict: int

# --- Funções Auxiliares e de Análise ---
# (Adaptadas do script anterior para retornar dados em vez de salvar arquivos)

def plot_to_base64():
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor=plt.gcf().get_facecolor())
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    return img_str

def inverse_transform_cases(scaler, data):
    if data.ndim == 1: data = data.reshape(-1, 1)
    dummy = np.zeros((len(data), scaler.n_features_in_))
    dummy[:, 0] = data.flatten()
    return scaler.inverse_transform(dummy)[:, 0]

def get_future_climate_data(df_mun, target_date):
    """Assume que o clima futuro será similar ao da mesma semana do ano anterior."""
    last_year_date = target_date - timedelta(days=364) # 52 semanas
    target_week = last_year_date.isocalendar()[1]
    target_year = last_year_date.year
    
    climate_data = df_mun[(df_mun['ano'] == target_year) & (df_mun['semana'] == target_week)]
    if not climate_data.empty:
        return climate_data.iloc[0]
    return df_mun.iloc[-1] # Fallback para o último dado conhecido

# --- Endpoint Principal da API ---
@app.post("/predict")
async def predict_dengue(request: PredictionRequest):
    """
    Recebe um código IBGE e o número de semanas, retorna a previsão e análises.
    """
    ibge_code = request.ibge_code
    weeks_to_predict = request.weeks_to_predict

    if ibge_code not in municipios['codigo_ibge'].values:
        raise HTTPException(status_code=404, detail="Código IBGE não encontrado no dataset.")

    # 1. Filtrar e preparar os dados do município
    municipio_name = municipios[municipios['codigo_ibge'] == ibge_code].iloc[0]['municipio']
    df_mun = df_master[df_master['codigo_ibge'] == ibge_code].copy().reset_index(drop=True)
    
    try:
        scaler_dyn = joblib.load(app.state.SCALER_DIR / f"{ibge_code}_dynamic.pkl")
        scaler_static = joblib.load(app.state.SCALER_DIR / f"{ibge_code}_static.pkl")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Arquivos de scaler para o município {ibge_code} não encontrados.")

    # 2. Lógica de Previsão Iterativa
    dynamic_features = list(FEATURE_NAMES_PT.keys())
    
    # Pega a sequência mais recente de dados reais
    last_real_sequence = df_mun[dynamic_features].iloc[-SEQUENCE_LENGTH:].copy()
    current_sequence_scaled = scaler_dyn.transform(last_real_sequence)
    
    static_data = df_mun[["latitude", "longitude"]].iloc[0].values.reshape(1, -1)
    static_input = scaler_static.transform(static_data)

    predictions = []
    last_date_str = f"{df_mun.iloc[-1]['ano']}-{df_mun.iloc[-1]['semana']}-1"
    last_date = datetime.strptime(last_date_str, "%Y-%W-%w")

    for i in range(weeks_to_predict):
        # Prepara o input para o modelo
        dynamic_input = np.array([current_sequence_scaled], dtype=np.float32)
        
        # Faz a previsão
        pred_scaled = model.predict([dynamic_input, static_input], verbose=0)[0][0]
        pred_real = inverse_transform_cases(scaler_dyn, np.array([pred_scaled]))[0]
        
        # Armazena a previsão
        future_date = last_date + timedelta(weeks=i + 1)
        predictions.append({
            "date": future_date.strftime('%Y-%m-%d'),
            "predicted_cases": max(0, round(pred_real)) # Evita casos negativos
        })
        
        # Atualiza a sequência para a próxima iteração
        future_climate = get_future_climate_data(df_mun, future_date)
        new_row = {
            "numero_casos": pred_scaled, # Usa o valor escalado para manter a consistência
            "T2M": future_climate["T2M"], "T2M_MAX": future_climate["T2M_MAX"],
            "T2M_MIN": future_climate["T2M_MIN"], "PRECTOTCORR": future_climate["PRECTOTCORR"],
            "RH2M": future_climate["RH2M"], "ALLSKY_SFC_SW_DWN": future_climate["ALLSKY_SFC_SW_DWN"]
        }
        new_row_df = pd.DataFrame([new_row])[dynamic_features]
        new_row_scaled = scaler_dyn.transform(new_row_df)[0]
        
        current_sequence_scaled = np.vstack([current_sequence_scaled[1:], new_row_scaled])

    # 3. Preparar dados históricos para o front-end
    historic_data = []
    for _, row in df_mun.tail(52).iterrows(): # Envia o último ano de dados
        date = datetime.strptime(f"{row['ano']}-{row['semana']}-1", "%Y-%W-%w")
        historic_data.append({
            "date": date.strftime('%Y-%m-%d'),
            "cases": row["numero_casos"]
        })
        
    # 4. Gerar Análises e Gráficos
    df_analysis = df_mun[dynamic_features].rename(columns=FEATURE_NAMES_PT)
    
    # Gráfico de Correlação (Lag Analysis)
    max_lag = 12
    cases_col_name = 'Nº de Casos de Dengue'
    lag_correlations = {
        col: [df_analysis[cases_col_name].corr(df_analysis[col].shift(lag)) for lag in range(1, max_lag + 1)]
        for col in FEATURE_NAMES_PT.values() if col != cases_col_name
    }
    
    plt.figure(figsize=(10, 6), facecolor='#18181b')
    ax = plt.gca()
    ax.set_facecolor('#18181b')
    for feature_name, corrs in lag_correlations.items():
        plt.plot(range(1, max_lag + 1), corrs, marker='o', linestyle='-', label=feature_name)
    plt.title('Análise de Defasagem (Lag)', color='white')
    plt.xlabel('Defasagem (Semanas)', color='white')
    plt.ylabel('Correlação com Casos', color='white')
    plt.xticks(color='white'); plt.yticks(color='white')
    plt.legend(facecolor='#27272a', edgecolor='gray', labelcolor='white')
    plt.grid(True, which='both', linestyle='--', linewidth=0.5, color='#444')
    lag_plot_b64 = plot_to_base64()

    # Insights e Sumário
    lag_peaks = {
        feature: (np.argmax(np.abs(corrs)) + 1)
        for feature, corrs in lag_correlations.items()
    }
    temp_lag = lag_peaks.get('Temperatura Média (°C)', 2)
    rain_lag = lag_peaks.get('Precipitação (mm)', 4)

    strategic_summary = (
        f"A IA identificou a **Temperatura** e a **Precipitação** como os principais gatilhos. "
        f"O impacto da temperatura é mais forte após **{temp_lag} semanas**, enquanto o da chuva ocorre após **{rain_lag} semanas**. "
        f"Ações preventivas devem ser intensificadas nesta janela de tempo após eventos climáticos extremos."
    )
    
    # 5. Montar e retornar a resposta final
    return {
        "municipality_name": municipio_name,
        "historic_data": historic_data,
        "predicted_data": predictions,
        "insights": {
            "lag_analysis_plot_base64": lag_plot_b64,
            "strategic_summary": strategic_summary,
            "tipping_points": [
                {"factor": "Temperatura", "value": f"Impacto máximo em {temp_lag} semanas"},
                {"factor": "Precipitação", "value": f"Impacto máximo em {rain_lag} semanas"},
                {"factor": "Umidade", "value": "Aumenta a sobrevida do mosquito adulto"},
            ]
        }
    }
