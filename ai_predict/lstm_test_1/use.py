import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
from tensorflow.keras.models import load_model

# --- Paths ---
INFERENCE_PATH = "../data/inference_data.parquet"   # novo arquivo de inferência
MODEL_PATH     = "./checkpoints/model_checkpoint_best.keras"
SCALER_DIR     = "./scalers/"

# --- Configuração da previsão ---
SEQUENCE_LENGTH = 12
CUTOFF_YEAR  = 2025  
CUTOFF_WEEK  = 20
FORECAST_END_WEEK = 31 

# Features (iguais às do treino)
DYN_FEATS = [
    "numero_casos", "T2M", "T2M_MAX", "T2M_MIN",
    "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
]
STATIC_FEATS = ["latitude", "longitude"]

def inverse_transform_cases(scaler, data, feature_index=0):
    """Desfaz a normalização apenas da coluna alvo (numero_casos)."""
    dummy = np.zeros((len(data), scaler.n_features_in_), dtype=np.float32)
    dummy[:, feature_index] = data
    return scaler.inverse_transform(dummy)[:, feature_index]

def epi_key(year, week):
    """Chave ordenável (ano, semana)."""
    return (int(year), int(week))

def find_index_of_year_week(df_mun, year, week):
    mask = (df_mun["ano"].astype(int) == int(year)) & (df_mun["semana"].astype(int) == int(week))
    idxs = np.flatnonzero(mask.values)
    return int(idxs[0]) if len(idxs) else None

def main():
    # --- Checagens básicas ---
    if not os.path.exists(MODEL_PATH):
        print(f"Erro: modelo '{MODEL_PATH}' não encontrado.")
        return
    if not os.path.exists(INFERENCE_PATH):
        print(f"Erro: arquivo de inferência '{INFERENCE_PATH}' não encontrado.")
        return

    # Carrega modelo e dados
    model = load_model(MODEL_PATH)
    df = pd.read_parquet(INFERENCE_PATH)

    # Valida colunas necessárias
    required_cols = {"codigo_ibge","municipio","ano","semana", *DYN_FEATS, *STATIC_FEATS}
    missing = required_cols - set(df.columns)
    if missing:
        print(f"Erro: colunas faltando no inference_data: {missing}")
        return

    # Tipos e ordenação temporal
    df["codigo_ibge"] = df["codigo_ibge"].astype(int)
    df["ano"] = df["ano"].astype(int)
    df["semana"] = df["semana"].astype(int)
    df = df.sort_values(by=["codigo_ibge","ano","semana"]).reset_index(drop=True)

    # Seleção do município por IBGE
    municipios = df[["codigo_ibge","municipio"]].drop_duplicates().sort_values("codigo_ibge")
    try:
        ibge = int(input("Digite o código IBGE do município: ").strip())
    except ValueError:
        print("Código inválido.")
        return
    if ibge not in municipios["codigo_ibge"].values:
        print("Município não encontrado no arquivo de inferência.")
        return

    mun_name = municipios.loc[municipios["codigo_ibge"] == ibge, "municipio"].iloc[0]
    df_mun = df[df["codigo_ibge"] == ibge].copy().reset_index(drop=True)

    # Índices de corte e fim
    cutoff_idx = find_index_of_year_week(df_mun, CUTOFF_YEAR, CUTOFF_WEEK)
    if cutoff_idx is None:
        print(f"Não encontrei {CUTOFF_YEAR}/{CUTOFF_WEEK:02d} para este município.")
        return
    end_idx = find_index_of_year_week(df_mun, CUTOFF_YEAR, FORECAST_END_WEEK)
    if end_idx is None:
        # caso o arquivo não chegue até a semana desejada, ajusta
        end_idx = len(df_mun) - 1
        print(f"Aviso: não encontrei {CUTOFF_YEAR}/{FORECAST_END_WEEK:02d}; "
              f"vou prever até o último registro disponível ({df_mun.loc[end_idx,'ano']}/{df_mun.loc[end_idx,'semana']:02d}).")

    # Verifica histórico suficiente
    if cutoff_idx + 1 < SEQUENCE_LENGTH:
        print(f"Histórico insuficiente: preciso de {SEQUENCE_LENGTH} semanas antes da semana {CUTOFF_WEEK}.")
        return

    # Carrega scalers do município
    scaler_dyn_path = os.path.join(SCALER_DIR, f"{ibge}_dynamic.pkl")
    scaler_static_path = os.path.join(SCALER_DIR, f"{ibge}_static.pkl")
    if not (os.path.exists(scaler_dyn_path) and os.path.exists(scaler_static_path)):
        print("Scalers deste município não encontrados.")
        return
    scaler_dyn = joblib.load(scaler_dyn_path)
    scaler_static = joblib.load(scaler_static_path)

    # Dados estáticos (1x2) e escalonados
    static_raw = df_mun[STATIC_FEATS].iloc[0].values.reshape(1, -1)
    static_scaled = scaler_static.transform(static_raw)  # (1,2)

    # Dados dinâmicos:
    dyn_raw = df_mun[DYN_FEATS].copy()

    # Para transformar com MinMaxScaler, precisamos substituir NaNs temporariamente na coluna 'numero_casos'
    # (não usaremos esses valores como entrada no futuro — serão substituídos pelas previsões)
    dyn_filled = dyn_raw.copy()
    if dyn_filled["numero_casos"].isna().any():
        dyn_filled["numero_casos"] = dyn_filled["numero_casos"].fillna(0.0)

    dyn_scaled = scaler_dyn.transform(dyn_filled.values).astype(np.float32)  # (T, 7)

    # --- Previsão direta multi-passo (sem usar casos reais do futuro) ---
    history = dyn_scaled[:cutoff_idx+1].tolist()  # até semana 20 inclusive
    forecast_idxs = list(range(cutoff_idx + 1, end_idx + 1))
    preds_scaled = []

    for idx in forecast_idxs:
        seq_input = np.array(history[-SEQUENCE_LENGTH:], dtype=np.float32).reshape(1, SEQUENCE_LENGTH, -1)
        yhat_scaled = model.predict([seq_input, static_scaled], verbose=0)[0, 0]
        preds_scaled.append(yhat_scaled)

        # monta a "próxima semana": clima da semana idx + y previsto
        next_row = dyn_scaled[idx].copy()
        next_row[0] = yhat_scaled  # substitui numero_casos pelo previsto (em escala)
        history.append(next_row)

    # Inversões de escala
    y_pred = inverse_transform_cases(scaler_dyn, np.array(preds_scaled))
    y_real_full = df_mun["numero_casos"].values.astype("float32")  # pode ter NaN nas últimas semanas

    # --- Gráfico ---
    x = np.arange(len(df_mun))
    plt.figure(figsize=(15, 7))

    # Histórico real (até a semana 20)
    plt.plot(x[:cutoff_idx+1], y_real_full[:cutoff_idx+1],
             label="Histórico (Real)", linestyle="--")

    # Futuro real (apenas para comparação visual; NÃO foi usado na entrada)
    plt.plot(x[cutoff_idx+1:end_idx+1], y_real_full[cutoff_idx+1:end_idx+1],
             label="Futuro (Real - comparação)")

    # Futuro previsto (21→31)
    plt.plot(x[cutoff_idx+1:end_idx+1], y_pred,
             label="Futuro (Previsto pela IA)", linestyle="--")

    # Linhas de corte
    plt.axvline(x=cutoff_idx, color="black", linestyle=":", linewidth=2,
                label=f"Corte {CUTOFF_YEAR}/{CUTOFF_WEEK:02d}")
    plt.axvline(x=end_idx, color="gray", linestyle=":", linewidth=1)

    # Título e eixos
    w_start = f"{int(df_mun.loc[0,'ano'])}/{int(df_mun.loc[0,'semana']):02d}"
    w_cut   = f"{CUTOFF_YEAR}/{CUTOFF_WEEK:02d}"
    w_end   = f"{int(df_mun.loc[end_idx,'ano'])}/{int(df_mun.loc[end_idx,'semana']):02d}"
    plt.title(f"Previsão Multi-passo (sem teacher forcing)\n"
              f"{mun_name} ({ibge}) — de {w_cut} até {w_end}")
    plt.xlabel("Semanas (ordenadas no tempo)")
    plt.ylabel("Número de casos")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()

    print("Concluído.")

if __name__ == "__main__":
    main()
