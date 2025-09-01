import os
import re
import json
import unicodedata
import pandas as pd
from epiweeks import Week
import datetime
from pathlib import Path
import numpy as np

# --- CAMINHOS ROBUSTOS ---
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

    year_match = re.search(r'mun(\d{4})\.csv', os.path.basename(file_path))
    if not year_match: return pd.DataFrame()
    year = int(year_match.group(1))
    
    max_week = max_epi_week(year)

    week_cols = [col for col in df.columns if col.lower().startswith("semana")]
    week_cols_filtered = [col for col in week_cols if int(re.search(r'(\d+)', col, re.IGNORECASE).group(1)) <= max_week]

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
    for fname in sorted(os.listdir(path)): # Ordena para processamento consistente
        if fname.endswith('.csv') and fname.startswith('mun'):
            print(f"Processando ficheiro de casos: {fname}")
            dfs.append(read_and_process_prev_file(os.path.join(path, fname)))
    if not dfs: return pd.DataFrame()
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

def load_climate_data(path):
    if not path.exists():
        raise FileNotFoundError(f"Ficheiro de clima não encontrado em {path}")
    df = pd.read_parquet(path, engine='fastparquet')
    df[["ano", "semana"]] = df["ano_semana"].str.extract(r"(\d{4})/(\d{2})").astype(int)
    return df

# ✅ --- FUNÇÃO TOTALMENTE REESCRITA PARA MAIOR ROBUSTEZ E CLAREZA ---
def create_inference_df(df_prev, df_climate, municipios_list, limit_year, last_cases_week):
    print(f"Criando dados de inferência com casos até {limit_year}/SE{last_cases_week}.")

    # 1. Prepara a base de municípios, padronizando os nomes das colunas
    all_municipios = pd.DataFrame(municipios_list)
    all_municipios.rename(columns={'nome': 'municipio'}, inplace=True)
    all_municipios['codigo_ibge'] = all_municipios['codigo_ibge'].astype(str)
    
    # 2. Cria a grelha completa de tempo (todas as semanas de todos os anos nos dados climáticos)
    all_year_week = df_climate[["ano", "semana"]].drop_duplicates()
    
    # 3. Cria a base final com todas as combinações de município x semana
    base_df = all_municipios.merge(all_year_week, how="cross")

    # 4. Junta os dados de casos (df_prev) à base.
    # O 'left' merge mantém todas as linhas da base.
    df_final = pd.merge(
        base_df,
        df_prev[['codigo_ibge', 'ano', 'semana', 'numero_casos']],
        on=['codigo_ibge', 'ano', 'semana'],
        how='left'
    )

    # 5. Junta os dados climáticos à base.
    df_climate['codigo_ibge'] = df_climate['codigo_ibge'].astype(str)
    df_final = pd.merge(
        df_final,
        df_climate.drop(columns=['municipio', 'ano_semana']),
        on=['codigo_ibge', 'ano', 'semana'],
        how='left'
    )
    
    # 6. Aplica a lógica de preenchimento de casos: 0 para o passado, NaN para o futuro
    # Preenche com 0 todos os casos históricos que não foram notificados (ficaram NaN após o merge)
    past_mask = (df_final['ano'] < limit_year) | ((df_final['ano'] == limit_year) & (df_final['semana'] <= last_cases_week))
    df_final.loc[past_mask, 'numero_casos'] = df_final.loc[past_mask, 'numero_casos'].fillna(0)

    # Define como NaN todos os casos futuros para a IA prever
    future_mask = ~past_mask
    df_final.loc[future_mask, 'numero_casos'] = np.nan
    
    # 7. Adiciona informações geográficas e a coluna 'notificacao'
    states_dict = load_states(STATES_JSON_PATH)
    df_final["uf_code"] = df_final["codigo_ibge"].str[:2]
    df_final["estado_sigla"] = df_final["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    df_final["regiao"] = df_final["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))
    df_final['notificacao'] = df_final["ano"].apply(lambda y: 1 if y in [2021, 2022] else 0)

    # 8. Ordena e finaliza
    df_final = df_final.sort_values(by=["codigo_ibge", "ano", "semana"]).reset_index(drop=True)

    final_columns = [
        "municipio", "numero_casos", "semana", "ano", "notificacao", "codigo_ibge",
        "latitude", "longitude", "estado_sigla", "regiao",
        "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]
    
    # Remove colunas extras e garante a ordem correta
    return df_final[[col for col in final_columns if col in df_final.columns]]

def main():
    target_week = Week.fromdate(datetime.date.today()) - 3
    LIMIT_YEAR = target_week.year
    LAST_CASES_WEEK = target_week.week
    
    print(f"Semana epidemiológica alvo: {target_week}. Limite de dados definido para {LIMIT_YEAR}/SE{LAST_CASES_WEEK}.")

    states_dict = load_states(STATES_JSON_PATH)
    municipios_list = load_municipios(MUNICIPIOS_JSON_PATH)

    df_prev = load_all_prev_files(DATA_PREV_PATH)
    if df_prev.empty:
        print("Nenhum ficheiro de casos encontrado. A terminar.")
        return
        
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
        if not df_year['numero_casos'].notna().any():
            print(f"No ano de {LIMIT_YEAR}: Nenhum dado de casos foi encontrado até à semana limite.")
        else:
            last_week_with_data = df_year['semana'][df_final['numero_casos'].notna()].max()
            print(f"No ano de {LIMIT_YEAR}:")
            print(f"  -> Última semana com dados de casos: {int(last_week_with_data)}")

if __name__ == "__main__":
    main()

