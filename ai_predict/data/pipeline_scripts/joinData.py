import os
import re
import json
import unicodedata
import pandas as pd
from epiweeks import Week
import datetime
from pathlib import Path 

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_PREV_PATH = SCRIPT_DIR / "../casos"
CLIMATE_PATH = SCRIPT_DIR / "../dadosClimaticos.parquet"
STATES_JSON_PATH = SCRIPT_DIR / "../municipios/estados.json"
MUNICIPIOS_JSON_PATH = SCRIPT_DIR / "../municipios/municipios.json"
OUTPUT_PATH = SCRIPT_DIR / "../inference_data.parquet"

def max_epi_week(year):
    day = datetime.date(year, 12, 31)
    while day.year >= year - 1:
        week = Week.fromdate(day)
        if week.year == year:
            return week.week
        day -= datetime.timedelta(days=1)
    return 52

def load_states(states_json_path):
    with open(states_json_path, "r", encoding="utf-8-sig") as f:
        states = json.load(f)
    return {str(s["codigo_uf"]).zfill(2): s for s in states}

def load_municipios(municipios_json_path):
    with open(municipios_json_path, "r", encoding="utf-8-sig") as f:
        return json.load(f)

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
            print(f"Processando {fname}")
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
    df = pd.read_parquet(path, engine='fastparquet')
    df["municipio_norm"] = df["municipio"].apply(normalize_name)
    df[["ano", "semana"]] = df["ano_semana"].str.extract(r"(\d{4})/(\d{2})").astype(int)
    return df

def create_inference_df(df_prev, df_climate, municipios_list, limit_year, last_cases_week):
    print(f"Criando dados de inferência com casos até {limit_year}/SE {last_cases_week}.")

    df_prev["codigo_ibge"] = df_prev["codigo_ibge"].astype(str)
    df_climate["codigo_ibge"] = df_climate["codigo_ibge"].astype(str)
    
    df_prev_filtered = df_prev[
        (df_prev['ano'] < limit_year) |
        ((df_prev['ano'] == limit_year) & (df_prev['semana'] <= last_cases_week))
    ].copy()

    df_merged = pd.merge(
        df_prev_filtered,
        df_climate,
        on=["codigo_ibge", "ano", "semana"],
        how="left"
    )

    all_municipios = pd.DataFrame(municipios_list)
    all_municipios["codigo_ibge"] = all_municipios["codigo_ibge"].astype(str)
    
    all_year_week = df_climate[["ano", "semana"]].drop_duplicates()

    base = all_municipios.merge(all_year_week, how="cross")
    base["codigo_ibge"] = base["codigo_ibge"].astype(str)

    base["numero_casos"] = 0
    future_mask = (base['ano'] == limit_year) & (base['semana'] > last_cases_week)
    base.loc[future_mask, "numero_casos"] = float("nan")
    future_mask_years = base['ano'] > limit_year
    base.loc[future_mask_years, "numero_casos"] = float("nan")

    existing_keys = df_merged.set_index(["codigo_ibge", "ano", "semana"]).index
    base_keys = base.set_index(["codigo_ibge", "ano", "semana"]).index
    base = base[~base_keys.isin(existing_keys)]
    
    base = pd.merge(base, df_climate, on=["codigo_ibge", "ano", "semana"], how="left")
    base["notificacao"] = base["ano"].apply(lambda y: 1 if y in [2021, 2022] else 0)
    
    states_dict = load_states(STATES_JSON_PATH)
    base["uf_code"] = base["codigo_ibge"].str[:2]
    base["estado_sigla"] = base["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    base["regiao"] = base["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))
    base = base.drop(columns=["uf_code"])

    df_final = pd.concat([df_merged, base], ignore_index=True)
    
    municipio_geo_map = all_municipios.set_index('codigo_ibge')[['latitude', 'longitude']].to_dict('index')
    
    lat_map = {k: v['latitude'] for k, v in municipio_geo_map.items()}
    lon_map = {k: v['longitude'] for k, v in municipio_geo_map.items()}

    df_final['latitude'] = df_final['latitude'].fillna(df_final['codigo_ibge'].map(lat_map))
    df_final['longitude'] = df_final['longitude'].fillna(df_final['codigo_ibge'].map(lon_map))

    df_final = df_final.sort_values(by=["codigo_ibge", "ano", "semana"]).reset_index(drop=True)

    final_columns = [
        "municipio", "numero_casos", "semana", "ano", "notificacao", "codigo_ibge",
        "latitude", "longitude", "estado_sigla", "regiao",
        "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]
    
    cols_to_use = [col for col in final_columns if col in df_final.columns]
    df_final = df_final[cols_to_use]
    
    return df_final

def main():
    target_week = Week.fromdate(datetime.date.today()) - 3
    LIMIT_YEAR = target_week.year
    LAST_CASES_WEEK = target_week.week
    
    print(f"Semana epidemiológica alvo: {target_week}. Limite de dados definido para {LIMIT_YEAR}/SE{LAST_CASES_WEEK}.")

    states_dict = load_states(STATES_JSON_PATH)
    municipios_list = load_municipios(MUNICIPIOS_JSON_PATH)

    df_prev = load_all_prev_files(DATA_PREV_PATH)
    df_prev = add_geo_info(df_prev, states_dict, municipios_list)
    df_climate = load_climate_data(CLIMATE_PATH)

    df_final = create_inference_df(df_prev, df_climate, municipios_list, 
                                   limit_year=LIMIT_YEAR, 
                                   last_cases_week=LAST_CASES_WEEK)

    df_final["codigo_ibge"] = df_final["codigo_ibge"].astype(str)
    df_final.to_parquet(OUTPUT_PATH, index=False)
    
    api_dir = Path(__file__).resolve().parent.parent.parent / "api" / "data"
    api_dir.mkdir(parents=True, exist_ok=True)
    api_path = api_dir / "inference_data.parquet"
    df_final.to_parquet(api_path, index=False)
    print(f"Dados de inferência também salvos em: {api_path}")
    
    print(f"\nDados de inferência finalizados e salvos em: {OUTPUT_PATH}")
    
    df_year = df_final[df_final['ano'] == LIMIT_YEAR]
    if not df_year.empty:
        last_week_with_data = df_year['semana'][df_final['numero_casos'].notna()].max()
        print(f"No ano de {LIMIT_YEAR}:")
        print(f"  -> Última semana com dados de casos: {int(last_week_with_data)}")

if __name__ == "__main__":
    main()

