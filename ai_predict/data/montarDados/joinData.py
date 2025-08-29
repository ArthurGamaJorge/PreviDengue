import os
import re
import json
import unicodedata
import pandas as pd
from epiweeks import Week
import datetime

# --- Constantes Corrigidas ---
# Caminhos atualizados para a nova estrutura de pastas.
DATA_PREV_PATH = "../casos"
CLIMATE_PATH = "../dadosClimaticos.parquet"
STATES_JSON_PATH = "../municipios/estados.json"
MUNICIPIOS_JSON_PATH = "../municipios/municipios.json"

# Saída para o ficheiro de treino final.
OUTPUT_PATH = "../final_training_data.parquet" 
OUTPUT_PATH = "../inference_data.parquet" 

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

# ✅ FUNÇÃO ATUALIZADA: Agora cria um dataset de treino completo, sem NaNs.
def create_final_dataset(df_prev, df_climate, municipios_list, limit_year, last_cases_week):
    """
    Cria um dataframe de treino completo, juntando casos e clima até uma data limite.
    Semanas sem casos notificados são preenchidas com 0.
    """
    print(f"Criando dataset de treino com dados até {limit_year}/SE {last_cases_week}.")

    # 1. Filtra os dados de casos para incluir apenas até a semana limite.
    df_prev_filtered = df_prev[
        (df_prev['ano'] < limit_year) |
        ((df_prev['ano'] == limit_year) & (df_prev['semana'] <= last_cases_week))
    ].copy()

    # 2. Cria uma base completa com todos os municípios e todas as semanas até o limite.
    all_municipios = pd.DataFrame(municipios_list)[['codigo_ibge', 'nome', 'latitude', 'longitude']]
    all_municipios['codigo_ibge'] = all_municipios['codigo_ibge'].astype(str)

    all_year_week = df_climate[
        (df_climate['ano'] < limit_year) |
        ((df_climate['ano'] == limit_year) & (df_climate['semana'] <= last_cases_week))
    ][["ano", "semana"]].drop_duplicates()

    base_df = all_municipios.merge(all_year_week, how="cross")

    # 3. Junta a base com os dados de casos. Semanas sem correspondência (sem casos) ficarão com NaN.
    df_merged = pd.merge(
        base_df,
        df_prev_filtered[['codigo_ibge', 'ano', 'semana', 'numero_casos']],
        on=['codigo_ibge', 'ano', 'semana'],
        how='left'
    )
    # Preenche com 0 os casos não notificados, que é o comportamento esperado.
    df_merged['numero_casos'] = df_merged['numero_casos'].fillna(0).astype(int)

    # 4. Junta os dados climáticos.
    # ✅ CORREÇÃO: Garante que a chave de merge 'codigo_ibge' tenha o mesmo tipo (string) em ambos os DataFrames.
    df_climate['codigo_ibge'] = df_climate['codigo_ibge'].astype(str)
    
    df_final = pd.merge(
        df_merged,
        df_climate.drop(columns=['municipio', 'municipio_norm', 'ano_semana']),
        on=['codigo_ibge', 'ano', 'semana'],
        how='left'
    )
    
    # 5. Adiciona informações geográficas restantes e ordena.
    states_dict = load_states(STATES_JSON_PATH)
    df_final["uf_code"] = df_final["codigo_ibge"].str[:2]
    df_final["estado_sigla"] = df_final["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    df_final["regiao"] = df_final["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))
    df_final['notificacao'] = df_final["ano"].apply(lambda y: 1 if y in [2021, 2022] else 0)

    df_final = df_final.sort_values(by=["codigo_ibge", "ano", "semana"]).reset_index(drop=True)

    # 6. Seleciona e reordena as colunas finais.
    final_columns = [
        "municipio", "numero_casos", "semana", "ano", "notificacao", "codigo_ibge",
        "latitude", "longitude", "estado_sigla", "regiao",
        "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]
    # Renomeia a coluna 'nome' para 'municipio' para consistência
    df_final.rename(columns={'nome': 'municipio'}, inplace=True)
    
    return df_final[final_columns]


def main():
    # ✅ CÁLCULO DINÂMICO DO LIMITE
    current_epi_week = Week.fromdate(datetime.date.today())
    LIMIT_YEAR = current_epi_week.year
    LAST_CASES_WEEK = current_epi_week.week - 3
    
    print(f"Semana epidemiológica atual: {current_epi_week.week}. Limite de dados definido para a semana {LAST_CASES_WEEK}.")

    states_dict = load_states(STATES_JSON_PATH)
    municipios_list = load_municipios(MUNICIPIOS_JSON_PATH)

    df_prev = load_all_prev_files(DATA_PREV_PATH)
    df_prev = add_geo_info(df_prev, states_dict, municipios_list)
    df_climate = load_climate_data(CLIMATE_PATH)

    # ✅ Chama a nova função com os parâmetros de limite
    df_final = create_final_dataset(df_prev, df_climate, municipios_list, 
                                   limit_year=LIMIT_YEAR, 
                                   last_cases_week=LAST_CASES_WEEK)

    df_final["codigo_ibge"] = df_final["codigo_ibge"].astype(str)
    df_final.to_parquet(OUTPUT_PATH, index=False)
    
    if OUTPUT_PATH.endswith("inference_data.parquet"):
        api_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "..", "api", "data", "inference_data.parquet"
        )
        df_final.to_parquet(api_path, index=False)
        print(f"Dados de inferência também salvos em: {api_path}")
    
    print(f"\nDados de treino finalizados e salvos em: {OUTPUT_PATH}")
    # Verifica a última semana no ficheiro final
    df_year = df_final[df_final['ano'] == LIMIT_YEAR]
    if not df_year.empty:
        last_week_with_data = df_year['semana'].max()
        print(f"No ano de {LIMIT_YEAR}:")
        print(f"  -> Última semana com dados no ficheiro final: {int(last_week_with_data)}")


if __name__ == "__main__":
    main()
