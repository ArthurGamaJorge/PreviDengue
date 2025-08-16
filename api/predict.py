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

warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-darkgrid')


class DenguePredictor:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parent
        self.sequence_length = 12
        self.feature_names_pt = {
            "numero_casos": "Nº de Casos de Dengue",
            "T2M": "Temperatura Média (°C)",
            "T2M_MAX": "Temperatura Máxima (°C)",
            "T2M_MIN": "Temperatura Mínima (°C)",
            "PRECTOTCORR": "Precipitação (mm)",
            "RH2M": "Umidade Relativa (%)",
            "ALLSKY_SFC_SW_DWN": "Radiação Solar (W/m²)"
        }
        self.scaler_cache = {}
        self.load_assets()

    def load_assets(self):
        AI_ASSETS_DIR = self.project_root / "models"
        INFERENCE_PATH = self.project_root / "data" / "inference_data.parquet"
        SCALER_DIR = AI_ASSETS_DIR / "scalers"
        MODEL_PATH = AI_ASSETS_DIR / "checkpoints" / "model_checkpoint_best.keras"

        self.scaler_dir = SCALER_DIR

        df_master = pd.read_parquet(INFERENCE_PATH)
        df_master['codigo_ibge'] = df_master['codigo_ibge'].astype(int)
        df_master['data_semana_iso'] = pd.to_datetime(
            df_master['ano'].astype(str) + '-' + df_master['semana'].astype(str) + '-1',
            format='%Y-%W-%w'
        )
        df_master = df_master.sort_values(by=['codigo_ibge', 'data_semana_iso']).reset_index(drop=True)
        self.df_master = df_master
        self.municipios = df_master[['codigo_ibge', 'municipio']].drop_duplicates().sort_values('codigo_ibge')

        self.model = tf.keras.models.load_model(MODEL_PATH)

    def plot_to_base64(self):
        buf = BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor='#18181b')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        return img_str

    def inverse_transform_cases(self, scaler, data):
        if data.ndim == 1:
            data = data.reshape(-1, 1)
        dummy = np.zeros((len(data), scaler.n_features_in_))
        dummy[:, 0] = data.flatten()
        return scaler.inverse_transform(dummy)[:, 0]

    def get_scalers(self, ibge_code: int):
        if ibge_code not in self.scaler_cache:
            dynamic_scaler = joblib.load(self.scaler_dir / "dynamics" / f"{ibge_code}_dynamic.pkl")
            static_scaler = joblib.load(self.scaler_dir / "statics" / f"{ibge_code}_static.pkl")
            self.scaler_cache[ibge_code] = {"dynamic": dynamic_scaler, "static": static_scaler}
        return self.scaler_cache[ibge_code]["dynamic"], self.scaler_cache[ibge_code]["static"]

    def predict(self, ibge_code: int, weeks_to_predict: int):
        scaler_dyn, scaler_static = self.get_scalers(ibge_code)
        df_mun = self.df_master[self.df_master['codigo_ibge'] == ibge_code].copy().reset_index(drop=True)
        if df_mun.empty:
            raise ValueError(f"Não há dados para o município {ibge_code}")

        municipio_name = self.municipios[self.municipios['codigo_ibge'] == ibge_code].iloc[0]['municipio']
        dynamic_features = list(self.feature_names_pt.keys())

        # --- LÓGICA DE PRÉ-PREDIÇÃO PARA O PRIMEIRO NaN ---
        # Verifica se a última semana no dataframe tem casos NaN (nosso cenário da semana 32)
        if pd.isna(df_mun['numero_casos'].iloc[-1]):
            print("INFO: Última semana com NaN detectada. Realizando predição inicial para preenchê-la.")

            # 1. Pega as 12 semanas ANTERIORES à semana com NaN. Esta sequência está completa.
            # Ex: se a linha 100 é a semana 32 (com NaN), pegamos da 88 a 99 (12 semanas)
            initial_sequence_df = df_mun.iloc[-self.sequence_length-1:-1]
            
            # Garante que os dados de CLIMA desta sequência inicial estão preenchidos (apenas por segurança)
            for col in dynamic_features[1:]: # Ignora 'numero_casos' aqui pois já sabemos que está preenchido
                if initial_sequence_df[col].isna().any():
                    col_mean = initial_sequence_df[col].mean(skipna=True)
                    initial_sequence_df.loc[:, col] = initial_sequence_df[col].fillna(col_mean)

            # 2. Prepara os dados de entrada para o modelo
            dynamic_input_scaled = scaler_dyn.transform(initial_sequence_df[dynamic_features])
            dynamic_input = np.array([dynamic_input_scaled], dtype=np.float32)
            
            # Os dados estáticos são da própria semana que queremos prever (a com NaN)
            static_input = scaler_static.transform(df_mun.iloc[-1][["latitude", "longitude"]].values.reshape(1, -1))

            # 3. Faz a predição da semana que continha o NaN
            pred_scaled_initial = self.model.predict([dynamic_input, static_input], verbose=0)[0][0]
            pred_real_initial = self.inverse_transform_cases(scaler_dyn, np.array([pred_scaled_initial]))[0]
            
            predicted_cases_initial = max(0, round(pred_real_initial))

            # 4. ATUALIZA o dataframe em memória com o valor previsto, substituindo o NaN
            df_mun.iloc[-1, df_mun.columns.get_loc('numero_casos')] = predicted_cases_initial
            print(f"INFO: Valor previsto para {df_mun.iloc[-1]['data_semana_iso'].date()}: {predicted_cases_initial} casos")

        # --- FIM DA LÓGICA DE PRÉ-PREDIÇÃO ---

        # Agora, o loop de predição principal começa a partir de um dataframe completo
        
        # Pega a sequência final ATUALIZADA para iniciar o loop de predições futuras
        last_sequence_scaled = scaler_dyn.transform(df_mun[dynamic_features].iloc[-self.sequence_length:])
        
        static_data = df_mun[["latitude", "longitude"]].iloc[-1].values.reshape(1, -1)
        static_input = scaler_static.transform(static_data)
        
        climate_lookup = {(row['ano'], row['semana']): row for _, row in df_mun.iterrows()}
        predictions = []
        # A última data REAL no dataframe original
        last_real_date = df_mun.iloc[-1]['data_semana_iso'] 

        for i in range(weeks_to_predict):
            dynamic_input = np.array([last_sequence_scaled], dtype=np.float32)
            pred_scaled = self.model.predict([dynamic_input, static_input], verbose=0)[0][0]
            
            pred_real = 0
            if pd.notna(pred_scaled) and np.isfinite(pred_scaled):
                pred_real = self.inverse_transform_cases(scaler_dyn, np.array([pred_scaled]))[0]

            future_date = last_real_date + timedelta(weeks=i + 1)
            predictions.append({
                "date": future_date.strftime('%Y-%m-%d'),
                "predicted_cases": max(0, round(pred_real))
            })
            
            # Monta a próxima linha para a sequência rolante
            future_year, future_week = future_date.year, future_date.isocalendar()[1]
            if (future_year, future_week) in climate_lookup:
                future_climate = climate_lookup[(future_year, future_week)]
            else:
                # Se não houver clima futuro, usa a média das últimas 4 semanas
                future_climate = df_mun[dynamic_features[1:]].tail(4).mean(axis=0, skipna=True) 

            new_row = np.zeros(len(dynamic_features), dtype=np.float32)
            new_row[0] = pred_scaled 
            for j, feat in enumerate(dynamic_features[1:], start=1):
                new_row[j] = future_climate[feat]
            
            new_row_scaled = scaler_dyn.transform(new_row.reshape(1, -1))[0]
            last_sequence_scaled = np.vstack([last_sequence_scaled[1:], new_row_scaled])

        # ... O resto da sua função (geração de gráficos, etc.) continua igual ...
        # Histórico das últimas 52 semanas
        historic_data = [ {"date": row['data_semana_iso'].strftime('%Y-%m-%d'), "cases": int(row["numero_casos"]) if not pd.isna(row["numero_casos"]) else None} for _, row in df_mun.tail(52).iterrows() ]


        # Lag analysis
        df_analysis = df_mun[dynamic_features].rename(columns=self.feature_names_pt)
        max_lag = 12
        cases_col_name = 'Nº de Casos de Dengue'
        lag_features = ['Temperatura Média (°C)', 'Precipitação (mm)']
        lag_correlations = {}
        for col in lag_features:
            corrs = []
            for lag in range(1, max_lag + 1):
                x = df_analysis[col].shift(lag)
                y = df_analysis[cases_col_name]
                valid_idx = x.notna() & y.notna()
                corr = y[valid_idx].corr(x[valid_idx]) if valid_idx.any() else 0
                corrs.append(corr)
            lag_correlations[col] = corrs

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
        lag_plot_b64 = self.plot_to_base64()

        lag_peaks = {feature: (np.argmax(np.abs(corrs)) + 1) for feature, corrs in lag_correlations.items()}
        temp_lag = lag_peaks.get('Temperatura Média (°C)', 2)
        rain_lag = lag_peaks.get('Precipitação (mm)', 4)

        strategic_summary = (
            f"A IA identificou a **Temperatura** e a **Precipitação** como os principais gatilhos. "
            f"O impacto da temperatura é mais forte após **{temp_lag} semanas**, enquanto o da chuva ocorre após **{rain_lag} semanas**. "
            f"Ações preventivas devem ser intensificadas nesta janela de tempo após eventos climáticos extremos."
        )

        response_data = {
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

        return response_data
