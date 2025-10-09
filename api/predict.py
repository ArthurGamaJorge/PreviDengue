import os
import json
import joblib
import numpy as np
import pandas as pd
import warnings
from pathlib import Path
from datetime import timedelta
from io import BytesIO
import base64
import tensorflow as tf
from tensorflow.keras.utils import register_keras_serializable
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from huggingface_hub import hf_hub_download

warnings.filterwarnings("ignore")
plt.style.use('seaborn-v0_8-darkgrid')

@register_keras_serializable(package="Custom", name="asymmetric_mse")
def asymmetric_mse(y_true, y_pred):
    penalty_factor = 10.0
    error = y_true - y_pred
    denom = tf.maximum(tf.abs(y_true), 1.0)
    rel = tf.abs(error) / denom
    penalty = tf.where(error > 0, 1.0 + penalty_factor * rel, 1.0)
    loss = tf.square(error) * penalty
    return tf.reduce_mean(loss)

class DenguePredictor:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parent
        self.sequence_length = 12
        self.horizon = 6
        self.year_min_train = 2014
        self.year_max_train = 2025
        self.dynamic_features = [
            "numero_casos", "casos_velocidade", "casos_aceleracao", "casos_mm_4_semanas",
            "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN",
            "week_sin", "week_cos", "year_norm"
        ]
        self.static_features = ["latitude", "longitude"]
        self.feature_names_pt = {
            "numero_casos": "Nº de Casos de Dengue",
            "T2M": "Temperatura Média (°C)",
            "PRECTOTCORR": "Precipitação (mm)"
        }
        self._loaded = False
        self.load_assets()

    def load_assets(self):
        models_dir = self.project_root / "models"
        scalers_dir = models_dir / "scalers"
        model_path = models_dir / "model.keras"
        city_map_path = models_dir / "city_to_idx.json"

        if not scalers_dir.exists():
            raise FileNotFoundError(str(scalers_dir) + " not found")

        self.scaler_dyn = joblib.load(scalers_dir / "scaler_dyn_global.pkl")
        self.scaler_static = joblib.load(scalers_dir / "scaler_static_global.pkl")
        self.scaler_target = joblib.load(scalers_dir / "scaler_target_global.pkl")

        if city_map_path.exists():
            with open(city_map_path, "r", encoding="utf-8") as fh:
                self.city_to_idx = {int(k): int(v) for k, v in json.load(fh).items()}
        else:
            self.city_to_idx = {}

        hf_token = os.environ.get("HF_TOKEN")
        inference_path = hf_hub_download(
            repo_id="previdengue/predict_inference_data",
            filename="inference_data.parquet",
            repo_type="dataset",
            token=hf_token
        )

        df = pd.read_parquet(inference_path)
        df["codigo_ibge"] = df["codigo_ibge"].astype(int)
        df["ano"] = df["ano"].astype(int)
        df["semana"] = df["semana"].astype(int)
        try:
            df["date"] = pd.to_datetime(df["ano"].astype(str) + df["semana"].astype(str) + "0", format="%Y%W%w", errors="coerce")
        except Exception:
            df["date"] = pd.NaT

        df = df.sort_values(by=["codigo_ibge", "date"]).reset_index(drop=True)
        df["week_sin"] = np.sin(2 * np.pi * df["semana"] / 52)
        df["week_cos"] = np.cos(2 * np.pi * df["semana"] / 52)
        df["year_norm"] = (df["ano"] - self.year_min_train) / (self.year_max_train - self.year_min_train)

        self.df_master = df
        self.municipios = df[["codigo_ibge", "municipio"]].drop_duplicates().sort_values("codigo_ibge")

        if not model_path.exists():
            raise FileNotFoundError(str(model_path) + " not found")

        self.model = tf.keras.models.load_model(model_path, custom_objects={"asymmetric_mse": asymmetric_mse}, compile=False)
        self._loaded = True

    def plot_to_base64(self, fig):
        buf = BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", facecolor=fig.get_facecolor())
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode("utf-8")
        plt.close(fig)
        return img_str

    def _prepare_sequence(self, df_mun):
        df_seq = df_mun.tail(self.sequence_length).copy()
        df_seq["casos_velocidade"] = df_seq["numero_casos"].diff().fillna(0)
        df_seq["casos_aceleracao"] = df_seq["casos_velocidade"].diff().fillna(0)
        df_seq["casos_mm_4_semanas"] = df_seq["numero_casos"].rolling(4, min_periods=1).mean()
        df_seq["week_sin"] = np.sin(2 * np.pi * df_seq["semana"] / 52)
        df_seq["week_cos"] = np.cos(2 * np.pi * df_seq["semana"] / 52)
        df_seq["year_norm"] = (df_seq["ano"] - self.year_min_train) / (self.year_max_train - self.year_min_train)
        return df_seq

    def predict(self, ibge_code: int, show_plot=False, display_history_weeks=52):
        if not self._loaded:
            raise RuntimeError("assets not loaded")

        df_mun = self.df_master[self.df_master["codigo_ibge"] == int(ibge_code)].copy().reset_index(drop=True)
        if df_mun.empty or len(df_mun) < self.sequence_length:
            raise ValueError(f"No data or insufficient history for ibge {ibge_code}")

        municipio_row = self.municipios[self.municipios["codigo_ibge"] == int(ibge_code)]
        municipality_name = municipio_row.iloc[0]["municipio"] if not municipio_row.empty else str(ibge_code)

        df_mun_clean = df_mun.dropna(subset=["numero_casos"]).reset_index(drop=True)
        if len(df_mun_clean) < self.sequence_length:
            raise ValueError(f"Insufficient known-case history for {ibge_code}")

        seq_df = self._prepare_sequence(df_mun_clean)
        if len(seq_df) < self.sequence_length:
            raise ValueError(f"Insufficient sequence length for {ibge_code}")

        dynamic_raw = seq_df[self.dynamic_features].values
        static_raw = seq_df[self.static_features].iloc[-1].values.reshape(1, -1)

        dynamic_scaled = self.scaler_dyn.transform(dynamic_raw).reshape(1, self.sequence_length, -1)
        static_scaled = self.scaler_static.transform(static_raw)

        city_idx = int(self.city_to_idx.get(int(ibge_code), 0))
        city_input = np.array([[city_idx]], dtype=np.int32)

        y_pred = self.model.predict([dynamic_scaled, static_scaled, city_input], verbose=0)
        if isinstance(y_pred, (list, tuple)):
            y_pred_reg = y_pred[0]
        else:
            y_pred_reg = y_pred

        y_pred_flat = y_pred_reg.reshape(-1, 1)
        y_pred_inv_flat = self.scaler_target.inverse_transform(y_pred_flat)
        y_pred_inv = y_pred_inv_flat.reshape(y_pred_reg.shape)
        pred_values = y_pred_inv.flatten()
        pred_values = np.maximum(pred_values, 0.0)

        last_known_case = seq_df["numero_casos"].iloc[-1]
        connected_prediction = np.insert(pred_values, 0, last_known_case)

        last_real_date = seq_df["date"].iloc[-1] if "date" in seq_df.columns else None
        predicted_data = []
        for i, val in enumerate(connected_prediction[1:]):
            pred_date = (last_real_date + timedelta(weeks=i + 1)).strftime("%Y-%m-%d") if pd.notna(last_real_date) else None
            predicted_data.append({"date": pred_date, "predicted_cases": int(round(float(val)))})

        hist_tail = df_mun.tail(min(len(df_mun), display_history_weeks)).copy()
        historic_data = []
        for _, row in hist_tail.iterrows():
            historic_data.append({
                "date": row["date"].strftime("%Y-%m-%d") if pd.notna(row.get("date")) else None,
                "cases": int(row["numero_casos"]) if pd.notna(row.get("numero_casos")) else None
            })

        lag_plot_b64, strategic_summary, tipping_points = self.generate_lag_insights(df_mun)

        insights = {
            "lag_analysis_plot_base64": lag_plot_b64,
            "strategic_summary": strategic_summary,
            "tipping_points": tipping_points
        }

        return {
            "municipality_name": municipality_name,
            "ibge": int(ibge_code),
            "last_known_index": int(df_mun.index[-1]),
            "historic_data": historic_data,
            "predicted_data": predicted_data,
            "insights": insights
        }

    def generate_lag_insights(self, df_mun):
        df_analysis = df_mun.rename(columns={"T2M": "Temperature_C", "PRECTOTCORR": "Precipitation_mm"})
        max_lag = 12
        cases_col = "numero_casos"
        lag_features = ["Temperature_C", "Precipitation_mm"]
        lag_correlations = {}

        for col in lag_features:
            if col in df_analysis.columns:
                corrs = []
                for lag in range(1, max_lag + 1):
                    try:
                        corr = df_analysis[cases_col].corr(df_analysis[col].shift(lag))
                    except Exception:
                        corr = np.nan
                    corrs.append(corr)
                lag_correlations[col] = corrs
            else:
                lag_correlations[col] = [np.nan] * max_lag

        fig, ax = plt.subplots(figsize=(10, 6), facecolor="#18181b")
        ax.set_facecolor("#18181b")

        for feature_name, corrs in lag_correlations.items():
            ax.plot(range(1, max_lag + 1), corrs, marker="o", linestyle="-", label=feature_name)

        ax.set_title("Lag Analysis", color="white")
        ax.set_xlabel("Lag (weeks)", color="white")
        ax.set_ylabel("Correlation with cases", color="white")
        ax.tick_params(colors="white")
        ax.legend(facecolor="#27272a", edgecolor="gray", labelcolor="white")
        ax.grid(True, which="both", linestyle="--", linewidth=0.5, color="#444")

        lag_plot_b64 = self.plot_to_base64(fig)

        lag_peaks = {}
        for feature, corrs in lag_correlations.items():
            if corrs and not all(pd.isna(corrs)):
                peak = int(np.nanargmax(np.abs(np.array(corrs))) + 1)
            else:
                peak = "N/A"
            lag_peaks[feature] = peak

        temp_lag = lag_peaks.get("Temperature_C", "N/A")
        rain_lag = lag_peaks.get("Precipitation_mm", "N/A")

        summary = (
            f"The model identifies Temperature and Precipitation as key climate triggers. "
            f"Temperature shows maximum impact after {temp_lag} weeks and precipitation after {rain_lag} weeks. "
            "Preventive actions should be intensified within these windows after extreme weather events."
        )

        tipping_points = [
            {"factor": "Temperature", "value": f"Peak impact in {temp_lag} weeks"},
            {"factor": "Precipitation", "value": f"Peak impact in {rain_lag} weeks"},
            {"factor": "Humidity", "value": "Increases adult mosquito survival"}
        ]

        return lag_plot_b64, summary, tipping_points