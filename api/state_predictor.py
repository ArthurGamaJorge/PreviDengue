import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import timedelta
import tensorflow as tf
from tensorflow.keras.utils import register_keras_serializable
from huggingface_hub import hf_hub_download

@register_keras_serializable(package="Custom", name="asymmetric_mse")
def asymmetric_mse(y_true, y_pred):
    penalty_factor = 10.0
    error = y_true - y_pred
    denom = tf.maximum(tf.abs(y_true), 1.0)
    rel = tf.abs(error) / denom
    penalty = tf.where(error > 0, 1.0 + penalty_factor * rel, 1.0)
    loss = tf.square(error) * penalty
    return tf.reduce_mean(loss)

class StatePredictor:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parent
        self.sequence_length = 12
        self.horizon = 6
        self.dynamic_features = [
            "casos_norm_log",
            "casos_velocidade", "casos_aceleracao", "casos_mm_4_semanas",
            "T2M_mean","T2M_std","PRECTOTCORR_mean","PRECTOTCORR_std",
            "RH2M_mean","RH2M_std","ALLSKY_SFC_SW_DWN_mean","ALLSKY_SFC_SW_DWN_std",
            "week_sin","week_cos","year_norm","notificacao"
        ]
        self.static_features = ["populacao_total"]
        self._loaded = False
        self.load_assets()

    def load_assets(self):
        models_dir = self.project_root / "models"
        scalers_dir = models_dir / "scalers"
        model_path = models_dir / "model_state.keras"
        state_map_path = models_dir / "state_to_idx.json"
        state_peak_path = models_dir / "state_peak.json"

        # scalers
        dyn_state = scalers_dir / "scaler_dyn_global_state.pkl"
        static_state = scalers_dir / "scaler_static_global_state.pkl"
        target_state = scalers_dir / "scaler_target_global_state.pkl"
        if not dyn_state.exists() or not static_state.exists() or not target_state.exists():
            raise FileNotFoundError("State scalers not found under models/scalers. Expected *_state.pkl files.")
        self.scaler_dyn = joblib.load(dyn_state)
        self.scaler_static = joblib.load(static_state)
        self.scaler_target = joblib.load(target_state)

        # mappings
        if state_map_path.exists():
            with open(state_map_path, "r", encoding="utf-8") as fh:
                self.state_to_idx = json.load(fh)
        else:
            self.state_to_idx = {}
        if state_peak_path.exists():
            with open(state_peak_path, "r", encoding="utf-8") as fh:
                self.state_peak_map = json.load(fh)
        else:
            self.state_peak_map = {}

        # inference dataset (HF only)
        hf_token = os.environ.get("HF_TOKEN")
        hf_repo = "previdengue/predict_inference_data_estadual"
        hf_filename = "inference_data_estadual.parquet"
        try:
            hf_path = hf_hub_download(
                repo_id=hf_repo,
                filename=hf_filename,
                repo_type="dataset",
                token=hf_token,
            )
            df_loaded = pd.read_parquet(hf_path)
        except Exception as e:
            raise FileNotFoundError(
                "Could not download 'inference_data_estadual.parquet' from HF repo 'previdengue/predict_inference_data_estadual'. "
                "Ensure the dataset exists and set HF_TOKEN if the repo requires authentication."
            ) from e

        # normalize
        df = df_loaded.copy()
        required = ["estado_sigla", "year", "week", "casos_soma"]
        if any(col not in df.columns for col in required):
            raise ValueError("State dataset missing required columns: ['estado_sigla','year','week','casos_soma']")
        df["estado_sigla"] = df["estado_sigla"].astype(str)
        df = df.sort_values(["estado_sigla", "year", "week"]).reset_index(drop=True)
        if "date" not in df.columns:
            try:
                df["date"] = pd.to_datetime(df["year"].astype(str) + df["week"].astype(str) + "0", format="%Y%W%w", errors="coerce")
            except Exception:
                pass
        if "week_sin" not in df.columns:
            df["week_sin"] = np.sin(2*np.pi*df["week"]/52)
        if "week_cos" not in df.columns:
            df["week_cos"] = np.cos(2*np.pi*df["week"]/52)
        if "year_norm" not in df.columns:
            year_min, year_max = df["year"].min(), df["year"].max()
            df["year_norm"] = (df["year"] - year_min) / max(1.0, (year_max - year_min))
        df["notificacao"] = df["year"].isin([2021, 2022]).astype(float)

        self.df_state = df
        if not model_path.exists():
            raise FileNotFoundError(str(model_path) + " not found")
        self.model = tf.keras.models.load_model(model_path, custom_objects={"asymmetric_mse": asymmetric_mse}, compile=False)
        self._loaded = True

    def _prepare_state_sequence(self, df_st: pd.DataFrame, state_sigla: str):
        df_st = df_st.copy()
        df_st['casos_velocidade'] = df_st['casos_soma'].diff().fillna(0)
        df_st['casos_aceleracao'] = df_st['casos_velocidade'].diff().fillna(0)
        df_st['casos_mm_4_semanas'] = df_st['casos_soma'].rolling(4, min_periods=1).mean()
        if "notificacao" not in df_st.columns:
            df_st["notificacao"] = df_st["year"].isin([2021, 2022]).astype(float)
        peak = float(self.state_peak_map.get(state_sigla, 1.0))
        if peak <= 0:
            peak = 1.0
        df_st["casos_norm"] = df_st["casos_soma"] / peak
        df_st["casos_norm_log"] = np.log1p(df_st["casos_norm"])
        return df_st

    def predict(self, state_sigla: str, year: int = None, week: int = None, display_history_weeks: int | None = None):
        if not self._loaded:
            raise RuntimeError("state assets not loaded")
        st = str(state_sigla).upper()
        df_st = self.df_state[self.df_state["estado_sigla"] == st].copy().sort_values(["year","week"]).reset_index(drop=True)
        if df_st.empty or len(df_st) < self.sequence_length:
            raise ValueError(f"No data or insufficient history for state {st}")
        df_st = self._prepare_state_sequence(df_st, st)
        if year is not None and week is not None:
            idx_list = df_st.index[(df_st['year'] == int(year)) & (df_st['week'] == int(week))].tolist()
            if not idx_list:
                raise ValueError("Prediction point (year/week) not found in state series")
            pred_point_idx = idx_list[0]
        else:
            pred_point_idx = len(df_st)
        last_known_idx = pred_point_idx - 1
        if last_known_idx < self.sequence_length - 1:
            raise ValueError("Insufficient sequence window before prediction point")
        start_idx = last_known_idx - self.sequence_length + 1
        input_seq = df_st.iloc[start_idx:last_known_idx+1].copy()
        for col in self.static_features:
            if col not in input_seq.columns:
                input_seq[col] = 0.0
        static_raw = input_seq[self.static_features].iloc[0].values.reshape(1, -1)
        missing_dyn = [c for c in self.dynamic_features if c not in input_seq.columns]
        if missing_dyn:
            raise ValueError(f"Missing dynamic state features: {missing_dyn}")
        dyn_raw = input_seq[self.dynamic_features].values
        if hasattr(self.scaler_dyn, "n_features_in_") and self.scaler_dyn.n_features_in_ != len(self.dynamic_features):
            raise ValueError(
                f"State dynamic scaler expects {self.scaler_dyn.n_features_in_} features, got {len(self.dynamic_features)}."
            )
        dyn_scaled = self.scaler_dyn.transform(dyn_raw).reshape(1, self.sequence_length, len(self.dynamic_features))
        static_scaled = self.scaler_static.transform(static_raw)
        state_idx = int(self.state_to_idx.get(st, 0))
        state_input = np.array([[state_idx]], dtype=np.int32)
        y_pred = self.model.predict([dyn_scaled, static_scaled, state_input], verbose=0)
        y_pred_reg = y_pred[0] if isinstance(y_pred, (list, tuple)) else y_pred
        y_pred_log_norm = self.scaler_target.inverse_transform(y_pred_reg.reshape(-1,1)).reshape(y_pred_reg.shape)
        y_pred_norm = np.expm1(y_pred_log_norm)
        peak = float(self.state_peak_map.get(st, 1.0))
        if peak <= 0:
            peak = 1.0
        prediction_counts = np.maximum(y_pred_norm.flatten() * peak, 0.0)
        last_known_date = df_st.iloc[last_known_idx]['date'] if 'date' in df_st.columns and last_known_idx < len(df_st) else None
        predicted_data = []
        for i, val in enumerate(prediction_counts):
            if pd.notna(last_known_date):
                pred_date = (last_known_date + timedelta(weeks=i+1)).strftime("%Y-%m-%d")
            else:
                pred_date = None
            predicted_data.append({"date": pred_date, "predicted_cases": int(round(float(val)))})
        if display_history_weeks is None or display_history_weeks <= 0:
            hist_tail = df_st.iloc[:last_known_idx+1].copy()
        else:
            hist_tail = df_st.iloc[max(0, last_known_idx - display_history_weeks): last_known_idx+1].copy()
        historic_data = []
        for _, row in hist_tail.iterrows():
            historic_data.append({
                "date": row["date"].strftime("%Y-%m-%d") if pd.notna(row.get("date")) else None,
                "cases": int(row["casos_soma"]) if pd.notna(row.get("casos_soma")) else None
            })
        return {
            "state": st,
            "last_known_index": int(last_known_idx),
            "historic_data": historic_data,
            "predicted_data": predicted_data,
        }
