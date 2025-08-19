import os
import re
import json
import unicodedata
import pandas as pd
from epiweeks import Week
import datetime

def max_epi_week(year):
    # Começa do último dia do ano
    day = datetime.date(year, 12, 31)
    # Vai retrocedendo até encontrar um dia cuja semana epidemiológica seja do ano correto
    while day.year >= year - 1:  # limite para evitar loop infinito, pode ajustar
        week = Week.fromdate(day)
        if week.year == year:
            return week.week
        day -= datetime.timedelta(days=1)
    # fallback caso algo dê errado
    return 52

DATA_PREV_PATH = "./data/prev"
CLIMATE_PATH = "./data/dadosClimaticos.parquet"
STATES_JSON_PATH = "./data/prev/estados.json"
MUNICIPIOS_JSON_PATH = "./data/prev/municipios.json"
OUTPUT_PATH = "./data/final_training_data.parquet"

def load_states(states_json_path):
    with open(states_json_path, "r", encoding="utf-8-sig") as f:
        states = json.load(f)
    return {str(s["codigo_uf"]).zfill(2): s for s in states}

def load_municipios(municipios_json_path):
    with open(municipios_json_path, "r", encoding="utf-8-sig") as f:
        return json.load(f)  # list of dicts

def read_and_process_prev_file(file_path):
    df = pd.read_csv(file_path, sep=';', encoding='latin1', skiprows=3, header=0, quotechar='"')
    first_col = df.columns[0]
    df[first_col] = df[first_col].str.strip()
    df = df[~df[first_col].str.contains("IGNORADO|EXTERIOR|TOTAL", case=False, na=False)]

    def parse(value):
        parts = str(value).split(' ', 1)
        return parts if len(parts) == 2 and parts[0].isdigit() else (None, None)

    df[['codigo_ibge_6', 'municipio']] = df[first_col].apply(lambda x: pd.Series(parse(x)))
    df = df.dropna(subset=['codigo_ibge_6'])

    year = int(re.search(r'(\d{4})', os.path.basename(file_path)).group(1))
    max_week = max_epi_week(year)

    week_cols = [col for col in df.columns if col.lower().startswith("semana")]
    week_cols_filtered = []
    for col in week_cols:
        m = re.search(r'(\d+)', col)
        if m and int(m.group(1)) <= max_week:
            week_cols_filtered.append(col)

    df[week_cols_filtered] = df[week_cols_filtered].replace("-", 0).apply(pd.to_numeric, errors='coerce').fillna(0).astype(int)

    df_long = df.melt(id_vars=['codigo_ibge_6', 'municipio'], value_vars=week_cols_filtered,
                      var_name='semana_str', value_name='numero_casos')
    df_long['semana'] = df_long['semana_str'].str.extract(r'(\d+)').astype(int)
    df_long.drop(columns='semana_str', inplace=True)

    df_long['ano'] = year
    df_long['notificacao'] = 1 if year in [2021, 2022] else 0

    return df_long

def load_all_prev_files(path):
    dfs = []
    for fname in os.listdir(path):
        if fname.endswith('.csv') and fname.startswith('mun'):
            print(f"Processing {fname}")
            dfs.append(read_and_process_prev_file(os.path.join(path, fname)))
    return pd.concat(dfs, ignore_index=True)

def add_geo_info(df, states_dict, municipios_list):
    ibge_map = {str(m["codigo_ibge"])[:6]: m for m in municipios_list}
    df["codigo_ibge"] = df["codigo_ibge_6"].map(lambda x: str(ibge_map.get(x, {}).get("codigo_ibge", "")))
    df["latitude"] = df["codigo_ibge_6"].map(lambda x: ibge_map.get(x, {}).get("latitude"))
    df["longitude"] = df["codigo_ibge_6"].map(lambda x: ibge_map.get(x, {}).get("longitude"))
    df["uf_code"] = df["codigo_ibge_6"].str[:2]
    df["estado_sigla"] = df["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    df["regiao"] = df["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))
    df.drop(columns=["codigo_ibge_6", "uf_code"], inplace=True)
    return df

def normalize_name(name):
    norm = unicodedata.normalize('NFKD', name)
    return re.sub(r'\s+', ' ', norm.encode('ASCII', 'ignore').decode()).lower().strip()

def load_climate_data(path):
    df = pd.read_parquet(path)
    df["municipio_norm"] = df["municipio"].apply(normalize_name)
    df[["ano", "semana"]] = df["ano_semana"].str.extract(r"(\d{4})/(\d{2})").astype(int)

    return df

def merge_and_fill(df_prev, df_climate, municipios_list):
    # Garante código ibge 6 dígitos como string
    df_prev["codigo_ibge"] = df_prev["codigo_ibge"].astype(str).str.zfill(6)
    df_climate["codigo_ibge"] = df_climate["codigo_ibge"].astype(str).str.zfill(6)

    if "ano_semana" in df_climate.columns:
        df_climate = df_climate.drop(columns=["ano_semana"])

    # Faz merge principal pelo codigo_ibge, ano e semana
    df_merged = df_prev.merge(
        df_climate,
        on=["codigo_ibge", "ano", "semana"],
        how="left"
    )

    # Cria base com todas combinações municipio x ano x semana para completar dados faltantes
    all_year_week = df_merged[["ano", "semana"]].drop_duplicates()
    all_municipios = pd.DataFrame(municipios_list)

    all_municipios["key"] = 1
    all_year_week["key"] = 1
    base = all_municipios.merge(all_year_week, on="key").drop("key", axis=1)

    base["numero_casos"] = 0
    base["notificacao"] = base["ano"].apply(lambda y: 1 if y in [2021, 2022] else 0)
    base["codigo_ibge"] = base["codigo_ibge"].astype(str).str.zfill(6)

    base["uf_code"] = base["codigo_ibge"].str[:2]
    states_dict = load_states(STATES_JSON_PATH)
    base["estado_sigla"] = base["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    base["regiao"] = base["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))
    base = base.drop(columns=["uf_code"])

    # Remove combinações que já existem em df_merged
    merged_keys = df_merged[["codigo_ibge", "ano", "semana"]].drop_duplicates()
    merged_keys["codigo_ibge"] = merged_keys["codigo_ibge"].astype(str).str.zfill(6)

    base = base.merge(
        merged_keys,
        on=["codigo_ibge", "ano", "semana"],
        how="left",
        indicator=True
    )
    base = base[base["_merge"] == "left_only"].drop(columns="_merge")

    # Adiciona dados climáticos aos registros faltantes
    base = base.merge(df_climate, on=["codigo_ibge", "ano", "semana"], how="left")

    # Junta tudo
    df_final = pd.concat([df_merged, base], ignore_index=True)

    # Mapeia código ibge para nome do município no df_final, garantindo preenchimento do campo
    municipio_map = {str(m["codigo_ibge"]).zfill(6): m["nome"] for m in municipios_list}
    df_final["municipio"] = df_final["codigo_ibge"].map(municipio_map)

    # Ordena e reseta índice
    df_final = df_final.sort_values(by=["codigo_ibge", "municipio", "ano", "semana"]).reset_index(drop=True)

    final_columns = [
        "municipio", "numero_casos", "semana", "ano", "notificacao", "codigo_ibge",
        "latitude", "longitude", "estado_sigla", "regiao",
        "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]

    df_final = df_final[final_columns]

    return df_final

def main():
    states_dict = load_states(STATES_JSON_PATH)
    municipios_list = load_municipios(MUNICIPIOS_JSON_PATH)

    df_prev = load_all_prev_files(DATA_PREV_PATH)
    df_prev = add_geo_info(df_prev, states_dict, municipios_list)
    df_climate = load_climate_data(CLIMATE_PATH)

    df_final = merge_and_fill(df_prev, df_climate, municipios_list)

    df_final["codigo_ibge"] = df_final["codigo_ibge"].astype(str)
    df_final.to_parquet(OUTPUT_PATH, index=False)


if __name__ == "__main__":
    main()