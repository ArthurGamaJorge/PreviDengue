import os
import re
import json
import unicodedata
import pandas as pd
from epiweeks import Week
import datetime

# --- Constantes ---
DATA_PREV_PATH = "./data/prev"
CLIMATE_PATH = "./data/dadosClimaticos.parquet"
STATES_JSON_PATH = "./data/prev/estados.json"
MUNICIPIOS_JSON_PATH = "./data/prev/municipios.json"
OUTPUT_PATH = "./data/inference_data.parquet" # Nome do arquivo de saída alterado

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

### MODIFICADO: Função 'merge_and_fill' substituída por 'create_inference_df' ###
def create_inference_df(df_prev, df_climate, municipios_list, limit_year, last_cases_week):
    """
    Cria um dataframe para inferência.
    - Usa dados de casos até a semana `last_cases_week` do ano `limit_year`.
    - Para semanas posteriores, os casos são NaN, mas os dados climáticos são mantidos.
    """
    print(f"Criando dados de inferência com casos até {limit_year}/SE {last_cases_week}.")

    # --- 1. Padroniza chaves (código IBGE de 7 dígitos) para evitar bugs de merge ---
    df_prev["codigo_ibge"] = df_prev["codigo_ibge"].astype(str).str.zfill(7)
    df_climate["codigo_ibge"] = df_climate["codigo_ibge"].astype(str).str.zfill(7)
    
    # --- 2. Filtra os casos de dengue para incluir apenas dados até o limite especificado ---
    df_prev_filtered = df_prev[
        (df_prev['ano'] < limit_year) |
        ((df_prev['ano'] == limit_year) & (df_prev['semana'] <= last_cases_week))
    ].copy()

    # --- 3. Junta os casos filtrados com os dados climáticos ---
    df_merged = pd.merge(
        df_prev_filtered,
        df_climate,
        on=["codigo_ibge", "ano", "semana"],
        how="left" # Mantém todos os casos históricos, mesmo que falte clima
    )

    # --- 4. Cria uma base completa com todos municípios e todas as semanas do período climático ---
    all_municipios = pd.DataFrame(municipios_list)
    all_municipios["codigo_ibge"] = all_municipios["codigo_ibge"].astype(str).str.zfill(7)
    
    # A base de tempo será o range completo dos dados climáticos
    all_year_week = df_climate[["ano", "semana"]].drop_duplicates()

    base = all_municipios.merge(all_year_week, how="cross")

    # --- 5. Preenche os valores de 'numero_casos' na base ---
    # Por padrão, semanas passadas sem notificação são 0
    base["numero_casos"] = 0
    # Semanas futuras (para predição) são NaN
    future_mask = (base['ano'] == limit_year) & (base['semana'] > last_cases_week)
    base.loc[future_mask, "numero_casos"] = float("nan")
    # Mantém NaN para qualquer ano futuro além do ano limite, se houver
    future_mask_years = base['ano'] > limit_year
    base.loc[future_mask_years, "numero_casos"] = float("nan")

    # --- 6. Remove da 'base' as combinações que já existem em 'df_merged' para não duplicar ---
    existing_keys = df_merged.set_index(["codigo_ibge", "ano", "semana"]).index
    base_keys = base.set_index(["codigo_ibge", "ano", "semana"]).index
    base = base[~base_keys.isin(existing_keys)]
    
    # --- 7. Adiciona os dados climáticos e geográficos na 'base' ---
    base = pd.merge(base, df_climate, on=["codigo_ibge", "ano", "semana"], how="left")
    base["notificacao"] = base["ano"].apply(lambda y: 1 if y in [2021, 2022] else 0)
    
    states_dict = load_states(STATES_JSON_PATH)
    base["uf_code"] = base["codigo_ibge"].str[:2]
    base["estado_sigla"] = base["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    base["regiao"] = base["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))
    base = base.drop(columns=["uf_code"])


    # --- 8. Concatena os dados e finaliza ---
    df_final = pd.concat([df_merged, base], ignore_index=True)
    
    # Preenche latitude e longitude para as linhas que vieram da 'base'
    municipio_geo_map = all_municipios.set_index('codigo_ibge')[['latitude', 'longitude']].to_dict('index')
    
    lat_map = {k: v['latitude'] for k, v in municipio_geo_map.items()}
    lon_map = {k: v['longitude'] for k, v in municipio_geo_map.items()}

    df_final['latitude'] = df_final['latitude'].fillna(df_final['codigo_ibge'].map(lat_map))
    df_final['longitude'] = df_final['longitude'].fillna(df_final['codigo_ibge'].map(lon_map))


    # Ordena para garantir a sequência temporal correta
    df_final = df_final.sort_values(by=["codigo_ibge", "ano", "semana"]).reset_index(drop=True)

    final_columns = [
        "municipio", "numero_casos", "semana", "ano", "notificacao", "codigo_ibge",
        "latitude", "longitude", "estado_sigla", "regiao",
        "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]
    
    # Garante que as colunas existam antes de tentar selecioná-las
    cols_to_use = [col for col in final_columns if col in df_final.columns]
    df_final = df_final[cols_to_use]
    
    return df_final


def main():
    ### MODIFICADO: Defina aqui o ano e a última semana com dados de casos ###
    # Exemplo: Usar casos até a semana 20 de 2025.
    # As semanas 21, 22, 23... de 2025 terão 'numero_casos' como NaN.
    LIMIT_YEAR = 2025
    LAST_CASES_WEEK = 20

    states_dict = load_states(STATES_JSON_PATH)
    municipios_list = load_municipios(MUNICIPIOS_JSON_PATH)

    df_prev = load_all_prev_files(DATA_PREV_PATH)
    df_prev = add_geo_info(df_prev, states_dict, municipios_list)
    df_climate = load_climate_data(CLIMATE_PATH)

    # Chama a nova função com os parâmetros de limite
    df_final = create_inference_df(df_prev, df_climate, municipios_list, 
                                   limit_year=LIMIT_YEAR, 
                                   last_cases_week=LAST_CASES_WEEK)

    df_final["codigo_ibge"] = df_final["codigo_ibge"].astype(str)
    df_final.to_parquet(OUTPUT_PATH, index=False)
    
    print(f"\nDados de inferência finalizados e salvos em: {OUTPUT_PATH}")
    # Verifica a última semana com e sem casos no ano limite
    df_year = df_final[df_final['ano'] == LIMIT_YEAR]
    last_week_with_data = df_year['semana'][df_year['numero_casos'].notna()].max()
    first_week_without_data = df_year['semana'][df_year['numero_casos'].isna()].min()
    print(f"No ano de {LIMIT_YEAR}:")
    print(f"  -> Última semana com dados de casos: {int(last_week_with_data)}")
    print(f"  -> Primeira semana com casos vazios (NaN): {int(first_week_without_data)}")


if __name__ == "__main__":
    main()