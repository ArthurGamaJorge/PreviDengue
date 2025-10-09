import pandas as pd
from pathlib import Path
import json
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
INFERENCE_PATH = SCRIPT_DIR / "../inference_data.parquet"
OUTPUT_PATH = SCRIPT_DIR / "../final_training_data_estadual.parquet"
POP_PATH = SCRIPT_DIR / "../municipios/populacao_2025.json"
STATES_JSON_PATH = SCRIPT_DIR / "../municipios/estados.json"

WEATHER_COLS = [
    "T2M",
    "PRECTOTCORR",
    "RH2M",
    "ALLSKY_SFC_SW_DWN",
]


def load_state_code_map(path: Path) -> dict:
    with open(path, "r", encoding="utf-8-sig") as f:
        states = json.load(f)
    return {state["uf"]: str(state["codigo_uf"]).zfill(2) for state in states}


def weighted_stats(values: pd.Series, weights: pd.Series) -> tuple[float, float]:
    mask = values.notna() & weights.notna()
    if not mask.any():
        return np.nan, np.nan

    v = values[mask].to_numpy(dtype=np.float64)
    w = weights[mask].to_numpy(dtype=np.float64)
    total_weight = w.sum()
    if total_weight <= 0:
        return np.nan, np.nan

    mean = float(np.average(v, weights=w))
    variance = float(np.average((v - mean) ** 2, weights=w))
    std = float(np.sqrt(variance))
    return mean, std


def main():
    # 1. Carrega dados municipais
    df = pd.read_parquet(INFERENCE_PATH)
    
    # 2. Carrega população (opcional, se quiser adicionar mais tarde)
    with open(POP_PATH, "r", encoding="utf-8") as f:
        pop_data = json.load(f)
    if isinstance(pop_data, dict):
        pop_map = {str(k): v for k, v in pop_data.items()}
    else:
        pop_map = {str(p["codigo_ibge"]): p["populacao_2025"] for p in pop_data}
    df["populacao"] = df["codigo_ibge"].map(pop_map)
    state_code_map = load_state_code_map(STATES_JSON_PATH)
    df["codigo_uf"] = df["estado_sigla"].map(state_code_map)
    
    group_cols = ["estado_sigla", "codigo_uf", "regiao", "ano", "semana", "notificacao"]

    def aggregate_state(group: pd.DataFrame) -> pd.Series:
        total_population = group["populacao"].sum(min_count=1)
        casos_soma = group["numero_casos"].sum(min_count=1)

        stats = {}
        weights = group["populacao"]
        for col in WEATHER_COLS:
            mean, std = weighted_stats(group[col], weights)
            stats[f"{col}_mean"] = mean
            stats[f"{col}_std"] = std

        return pd.Series(
            {
                "casos_soma": casos_soma,
                "populacao_total": total_population,
                **stats,
            }
        )

    df_state = df.groupby(group_cols, group_keys=False).apply(aggregate_state, include_groups=False).reset_index()

    # Rename temporal columns
    df_state = df_state.rename(columns={"semana": "week", "ano": "year"})

    # Ordena
    df_state = df_state.sort_values(["estado_sigla", "year", "week"]).reset_index(drop=True)

    # Salva
    df_state.to_parquet(OUTPUT_PATH, index=False)
    print(f"Dataset estadual salvo em: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
