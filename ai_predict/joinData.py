import os
import re
import json
import unicodedata
import pandas as pd

DATA_PREV_PATH = "ai_predict/data/prev"
CLIMATE_PATH = "ai_predict/data/dadosClimaticos.parquet"
STATES_JSON_PATH = "ai_predict/data/prev/estados.json"
MUNICIPIOS_JSON_PATH = "ai_predict/data/prev/municipios.json"
OUTPUT_PATH = "ai_predict/data/final_training_data.parquet"

def load_states(states_json_path):
    with open(states_json_path, "r", encoding="utf-8-sig") as f:
        states = json.load(f)
    states_dict = {str(state["codigo_uf"]).zfill(2): state for state in states}
    return states_dict

def load_municipios(municipios_json_path):
    with open(municipios_json_path, "r", encoding="utf-8-sig") as f:
        municipios = json.load(f)
    return municipios  # List of dicts

def read_and_process_prev_file(file_path, is_notification):
    df_raw = pd.read_csv(file_path, sep=';', encoding='latin1', skiprows=3, header=0, quotechar='"')
    first_col = df_raw.columns[0]
    df_raw[first_col] = df_raw[first_col].str.strip()
    df_raw = df_raw[~df_raw[first_col].str.contains("IGNORADO|EXTERIOR|TOTAL", case=False, na=False)]

    def parse_municipio_code_and_name(value):
        parts = str(value).split(' ', 1)
        if len(parts) == 2 and parts[0].isdigit() and len(parts[0]) == 6:
            return parts[0], parts[1]
        else:
            return pd.NA, pd.NA

    df_raw[['codigo_ibge', 'municipio']] = df_raw[first_col].apply(lambda x: pd.Series(parse_municipio_code_and_name(x)))
    df_raw = df_raw.dropna(subset=['codigo_ibge'])

    week_cols = [col for col in df_raw.columns if col.lower().startswith('semana')]
    df_raw[week_cols] = df_raw[week_cols].replace('-', 0).apply(pd.to_numeric, errors='coerce').fillna(0).astype(int)

    df_long = df_raw.melt(id_vars=['codigo_ibge', 'municipio'], value_vars=week_cols,
                          var_name='semana_str', value_name='numero_casos')
    df_long['semana'] = df_long['semana_str'].str.extract(r'Semana (\d+)').astype(int)
    df_long = df_long.drop(columns=['semana_str'])

    filename = os.path.basename(file_path)
    year_match = re.search(r'(\d{4})', filename)
    year = int(year_match.group(1)) if year_match else pd.NA
    df_long['ano'] = year
    df_long['notificacao'] = 1 if is_notification else 0

    return df_long

def load_all_prev_files(data_prev_path):
    all_dfs = []
    for fname in os.listdir(data_prev_path):
        if fname.endswith(".csv") and fname.startswith("mun"):
            full_path = os.path.join(data_prev_path, fname)
            is_notification = "Not" in fname
            print(f"Processing {fname} (notification={is_notification})")
            df = read_and_process_prev_file(full_path, is_notification)
            all_dfs.append(df)
    return pd.concat(all_dfs, ignore_index=True)

def add_geo_info_and_fix_ibge(df, states_dict, municipios_list):
    # Pad 6 digits (from CSV)
    df["codigo_ibge_6"] = df["codigo_ibge"].astype(str).str.zfill(6)
    df["uf_code"] = df["codigo_ibge_6"].str[:2]
    df["estado_sigla"] = df["uf_code"].map(lambda x: states_dict.get(x, {}).get("uf"))
    df["regiao"] = df["uf_code"].map(lambda x: states_dict.get(x, {}).get("regiao"))

    # Map 6-digit code prefix to municipio dict with full 7-digit code
    ibge6_to_mun = {}
    for mun in municipios_list:
        key = str(mun["codigo_ibge"])[:6]  # first 6 digits
        ibge6_to_mun[key] = mun

    def get_codigo_ibge_completo(codigo6):
        mun = ibge6_to_mun.get(codigo6)
        if mun:
            return str(mun["codigo_ibge"])
        return None

    def get_lat(codigo6):
        mun = ibge6_to_mun.get(codigo6)
        if mun:
            return mun.get("latitude")
        return None

    def get_lon(codigo6):
        mun = ibge6_to_mun.get(codigo6)
        if mun:
            return mun.get("longitude")
        return None

    df["codigo_ibge"] = df["codigo_ibge_6"].map(get_codigo_ibge_completo)
    df["latitude"] = df["codigo_ibge_6"].map(get_lat)
    df["longitude"] = df["codigo_ibge_6"].map(get_lon)

    df.drop(columns=["codigo_ibge_6"], inplace=True)
    return df

def load_climate_data(climate_path):
    return pd.read_parquet(climate_path)

def normalize_name(name):
    nfkd_form = unicodedata.normalize('NFKD', name)
    only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('ASCII')
    return re.sub(r'\s+', ' ', only_ascii).strip().lower()

def merge_climate_with_prev(df_prev, df_clim):
    df_prev["municipio_norm"] = df_prev["municipio"].apply(normalize_name)
    df_clim["municipio_norm"] = df_clim["municipio"].apply(normalize_name)

    df_prev["ano_semana"] = df_prev["ano"].astype(str) + "/" + df_prev["semana"].apply(lambda x: f"{x:02d}")
    df_clim["ano_semana"] = df_clim["ano_semana"].astype(str)

    merged_df = df_prev.merge(
        df_clim,
        how="left",
        on=["municipio_norm", "ano_semana"],
        suffixes=('', '_clim')
    )

    merged_df.drop(columns=["municipio_norm", "municipio_clim", "ano_semana"], inplace=True, errors='ignore')

    return merged_df

def main():
    states_dict = load_states(STATES_JSON_PATH)
    municipios_list = load_municipios(MUNICIPIOS_JSON_PATH)

    df_prev = load_all_prev_files(DATA_PREV_PATH)
    df_prev = add_geo_info_and_fix_ibge(df_prev, states_dict, municipios_list)

    df_climate = load_climate_data(CLIMATE_PATH)
    df_final = merge_climate_with_prev(df_prev, df_climate)

    df_final.to_parquet(OUTPUT_PATH, index=False)
    print(f"Final training data saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
