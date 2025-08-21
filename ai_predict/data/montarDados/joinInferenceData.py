import os
import re
import json
import unicodedata
import pandas as pd
from epiweeks import Week
import datetime

# --- Constantes ---
DATA_PREV_PATH = "../casos"
CLIMATE_PATH = "../dadosClimaticos.parquet"
STATES_JSON_PATH = "../municipios/estados.json"
MUNICIPIOS_JSON_PATH = "../municipios/municipios.json"
OUTPUT_PATH = "../inference_data.parquet"

# --- Funções auxiliares (sem alteração) ---
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

# A função de normalização de nome não é mais necessária para o resultado final,
# mas é mantida pois a função load_climate_data a utiliza internamente.
def normalize_name(name):
    norm = unicodedata.normalize('NFKD', name)
    return re.sub(r'\s+', ' ', norm.encode('ASCII', 'ignore').decode()).lower().strip()

def read_and_process_prev_file(file_path):
    df = pd.read_csv(file_path, sep=';', encoding='latin1', skiprows=3, header=0, quotechar='"')
    first_col = df.columns[0]
    df[first_col] = df[first_col].str.strip()
    df = df[~df[first_col].str.contains("IGNORADO|EXTERIOR|TOTAL", case=False, na=False)]
    
    def parse(value):
        parts = str(value).split(' ', 1)
        return parts if len(parts) == 2 and parts[0].isdigit() else (None, None)
        
    df[['codigo_ibge_6', 'municipio']] = df[first_col].apply(lambda x: pd.Series(parse(x)))
    df = df.dropna(subset=['codigo_ibge_6', 'municipio'])
    
    year = int(re.search(r'(\d{4})', os.path.basename(file_path)).group(1))
    max_week = max_epi_week(year)
    week_cols = [col for col in df.columns if col.lower().startswith("semana")]
    week_cols_filtered = [col for col in week_cols if int(re.search(r'(\d+)', col).group(1)) <= max_week]
    df[week_cols_filtered] = df[week_cols_filtered].replace("-", 0).apply(pd.to_numeric, errors='coerce').fillna(0).astype(int)
    
    # O 'municipio' extraído aqui será sobrescrito no final para garantir consistência
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
    ibge_map_6_to_7 = {str(m["codigo_ibge"])[:6]: str(m["codigo_ibge"]) for m in municipios_list}
    ibge_map_7_to_geo = {str(m["codigo_ibge"]): m for m in municipios_list}
    
    df["codigo_ibge"] = df["codigo_ibge_6"].map(ibge_map_6_to_7).str.zfill(7)
    df["latitude"] = df["codigo_ibge"].map(lambda x: ibge_map_7_to_geo.get(x, {}).get("latitude"))
    df["longitude"] = df["codigo_ibge"].map(lambda x: ibge_map_7_to_geo.get(x, {}).get("longitude"))
    df["uf_code"] = df["codigo_ibge"].str[:2]
    df["estado_sigla"] = df["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    df["regiao"] = df["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))
    df.drop(columns=["codigo_ibge_6", "uf_code"], inplace=True)
    return df

def load_climate_data(path):
    df = pd.read_parquet(path)
    # A coluna 'municipio_norm' é usada apenas para processamento interno e não afeta a saída final
    df["municipio_norm"] = df["municipio"].apply(normalize_name)
    df[["ano", "semana"]] = df["ano_semana"].str.extract(r"(\d{4})/(\d{2})").astype(int)
    return df

def create_inference_df(df_prev, df_climate, municipios_list, limit_year, last_cases_week):
    print(f"Criando dados de inferência com casos até {limit_year}/SE {last_cases_week}.")

    df_prev["codigo_ibge"] = df_prev["codigo_ibge"].astype(str).str.zfill(7)
    df_climate["codigo_ibge"] = df_climate["codigo_ibge"].astype(str).str.zfill(7)
    
    df_prev_filtered = df_prev[
        (df_prev['ano'] < limit_year) |
        ((df_prev['ano'] == limit_year) & (df_prev['semana'] <= last_cases_week))
    ].copy()

    df_merged = pd.merge(
        df_prev_filtered, df_climate.drop(columns=['municipio', 'municipio_norm', 'ano_semana'], errors='ignore'),
        on=["codigo_ibge", "ano", "semana"], how="left"
    )

    all_municipios = pd.DataFrame(municipios_list)
    all_municipios["codigo_ibge"] = all_municipios["codigo_ibge"].astype(str).str.zfill(7)
    
    geo_cols = ["codigo_ibge", "latitude", "longitude"] # Apenas colunas que não serão mapeadas depois
    all_municipios_geo = all_municipios[geo_cols]
    
    all_year_week = df_climate[["ano", "semana"]].drop_duplicates()
    base = pd.merge(all_municipios_geo, all_year_week, how="cross")

    base["numero_casos"] = 0
    future_mask = (base['ano'] > limit_year) | ((base['ano'] == limit_year) & (base['semana'] > last_cases_week))
    base.loc[future_mask, "numero_casos"] = float("nan")

    existing_keys = df_merged.set_index(["codigo_ibge", "ano", "semana"]).index
    base = base.set_index(["codigo_ibge", "ano", "semana"])
    base = base.loc[~base.index.isin(existing_keys)].reset_index()
    
    base = pd.merge(
        base, df_climate.drop(columns=['municipio', 'municipio_norm', 'ano_semana'], errors='ignore'),
        on=["codigo_ibge", "ano", "semana"], how="left"
    )

    df_final = pd.concat([df_merged, base], ignore_index=True)

    ### CORREÇÃO FINAL: Garante 100% de consistência nos nomes e dados geográficos ###
    # Cria mapas definitivos a partir da lista de municípios (fonte da verdade)
    municipio_map = {str(m['codigo_ibge']).zfill(7): m['nome'] for m in municipios_list}
    states_dict = load_states(STATES_JSON_PATH)
    uf_map = {str(m['codigo_ibge']).zfill(7): states_dict.get(str(m['codigo_ibge'])[:2], {}).get('uf') for m in municipios_list}
    regiao_map = {str(m['codigo_ibge']).zfill(7): states_dict.get(str(m['codigo_ibge'])[:2], {}).get('regiao') for m in municipios_list}

    # Sobrescreve as colunas no DataFrame final para garantir consistência total
    df_final['municipio'] = df_final['codigo_ibge'].map(municipio_map)
    df_final['estado_sigla'] = df_final['codigo_ibge'].map(uf_map)
    df_final['regiao'] = df_final['codigo_ibge'].map(regiao_map)
    
    df_final['notificacao'] = df_final['ano'].apply(lambda y: 1 if y in [2021, 2022] else 0)
    df_final = df_final.sort_values(by=["codigo_ibge", "ano", "semana"]).reset_index(drop=True)

    final_columns = [
        "municipio", "numero_casos", "semana", "ano", "notificacao", "codigo_ibge",
        "latitude", "longitude", "estado_sigla", "regiao",
        "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]
    return df_final[final_columns]


def main():
    LIMIT_YEAR = 2025
    LAST_CASES_WEEK = 31

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
    
    print(f"\nDados de inferência finalizados e salvos em: {OUTPUT_PATH}")
    df_year = df_final[df_final['ano'] == LIMIT_YEAR]
    if not df_year.empty:
        last_week_with_data = df_year.loc[df_year['numero_casos'].notna(), 'semana'].max()
        first_week_without_data = df_year.loc[df_year['numero_casos'].isna(), 'semana'].min()
        print(f"No ano de {LIMIT_YEAR}:")
        if pd.notna(last_week_with_data):
            print(f"  -> Última semana com dados de casos: {int(last_week_with_data)}")
        if pd.notna(first_week_without_data):
            print(f"  -> Primeira semana com casos vazios (NaN): {int(first_week_without_data)}")

if __name__ == "__main__":
    main()