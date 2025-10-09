import sys
import os 
import requests
import csv
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import tabula.io
import pandas as pd
import json
import os

def comparar_com_municipios_json(pop_dict):
    # Caminho do municipios.json
    municipios_json_path = os.path.join(os.path.dirname(__file__), '../municipios/municipios.json')
    with open(municipios_json_path, 'r', encoding='utf-8-sig') as f:
        municipios_data = json.load(f)
    # Extrai todos os códigos IBGE do municipios.json
    if isinstance(municipios_data, dict):
        codigos_oficiais = set(str(k).zfill(7) for k in municipios_data.keys())
    elif isinstance(municipios_data, list):
        codigos_oficiais = set(str(m.get('codigo_ibge') or m.get('codigo') or m.get('id')).zfill(7) for m in municipios_data if m and (m.get('codigo_ibge') or m.get('codigo') or m.get('id')) is not None)
    else:
        print('Formato inesperado em municipios.json')
        return
    codigos_extraidos = set(str(k).zfill(7) for k in pop_dict.keys())
    faltando = sorted(codigos_oficiais - codigos_extraidos)
    print(f"\nMunicípios faltando ({len(faltando)}):")
    for cod in faltando:
        print(cod)


# Caminho do PDF de estimativa
pdf_path = os.path.join(os.path.dirname(__file__), '../municipios/estimativa_dou_2025.pdf')
# Caminho do JSON de saída
json_path = os.path.join(os.path.dirname(__file__), '../municipios/populacao_2025.json')

EXPECTED_HEADERS = ['UF', 'COD. UF', 'COD. MUNIC', 'NOME DO MUNICÍPIO', 'POPULAÇÃO ESTIMADA']

def normalize_text(value: str) -> str:
    return str(value).replace('\n', ' ').strip().upper()

def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Garantir que o DataFrame tenha as colunas esperadas."""
    if df.empty:
        return df

    normalized_cols = [normalize_text(col) for col in df.columns]
    rename_map = {}
    for col, norm in zip(df.columns, normalized_cols):
        if norm in EXPECTED_HEADERS:
            rename_map[col] = EXPECTED_HEADERS[EXPECTED_HEADERS.index(norm)]

    if set(EXPECTED_HEADERS).issubset(rename_map.values()):
        df = df.rename(columns=rename_map)
    else:
        first_row_norm = [normalize_text(val) for val in df.iloc[0]]
        candidate_map = {}
        for col, norm in zip(df.columns, first_row_norm):
            if norm in EXPECTED_HEADERS and norm not in candidate_map.values():
                candidate_map[col] = EXPECTED_HEADERS[EXPECTED_HEADERS.index(norm)]
        if set(EXPECTED_HEADERS).issubset(candidate_map.values()):
            df = df.rename(columns=candidate_map)
            df = df.iloc[1:].reset_index(drop=True)
            normalized_cols = [normalize_text(col) for col in df.columns]

    if not set(EXPECTED_HEADERS).issubset([normalize_text(col) for col in df.columns]):
        return pd.DataFrame(columns=EXPECTED_HEADERS)

    df = df.rename(columns={col: EXPECTED_HEADERS[EXPECTED_HEADERS.index(normalize_text(col))] for col in df.columns if normalize_text(col) in EXPECTED_HEADERS})

    df = df[EXPECTED_HEADERS]

    df = df[df['NOME DO MUNICÍPIO'].apply(lambda x: normalize_text(x) not in EXPECTED_HEADERS)]

    return df.reset_index(drop=True)

def extrai_populacao():
    print('Lendo tabelas do PDF...')
    tabelas = tabula.io.read_pdf(pdf_path, pages='all', multiple_tables=True, lattice=True)

    # Teste: procurar por 'Pimenteiras do Oeste' em todas as tabelas
    nome_teste = 'Pimenteiras do Oeste'
    encontrou_nome = False
    for idx, tabela in enumerate(tabelas):
        df = pd.DataFrame(tabela)
        for _, row in df.iterrows():
            for val in row.values:
                if isinstance(val, str) and nome_teste.lower() in val.lower():
                    print(f"Encontrado '{nome_teste}' na tabela {idx}: {row}")
                    encontrou_nome = True
    if not encontrou_nome:
        print(f"'{nome_teste}' não encontrado em nenhuma tabela extraída do PDF!")
    # Lista de códigos IBGE problemáticos para depuração
    codigos_teste = set([
        '1100015','1100023','1100031','1100049','1100056','1100064','1100072','1100080','1100098','1100106','1100114','1100122','1100130','1100148','1100155','1100189','1100205','1100254','1100262','1100288','1100296','1100304','1100320','1100338','1100346','1100379','1100403','1100452','1100502','1100601','1100700','1100809','1100908','1100924','1100940','1101005','1101104','1101203','1101302','1101401','1101435','1101450','1101468'
    ])
    print('Lendo tabelas do PDF...')
    tabelas = tabula.io.read_pdf(pdf_path, pages='all', multiple_tables=True, lattice=True)
    pop_dict = {}
    erros = 0
    for idx, tabela in enumerate(tabelas):
        df_raw = pd.DataFrame(tabela)
        df = normalize_dataframe(df_raw)
        if df.empty:
            continue
        if set(['COD. UF', 'COD. MUNIC', 'POPULAÇÃO ESTIMADA']).issubset(df.columns):
            for _, row in df.iterrows():
                cod_uf = row['COD. UF']
                cod_mun = row['COD. MUNIC']
                pop = row['POPULAÇÃO ESTIMADA']
                try:
                    cod_uf_str = str(cod_uf).strip().zfill(2)
                    cod_mun_str = str(cod_mun).strip().zfill(5)
                    if len(cod_mun_str) > 5:
                        cod_mun_str = cod_mun_str[-5:]
                    codigo_ibge = cod_uf_str + cod_mun_str
                    # Teste: imprimir se for um dos problemáticos
                    if codigo_ibge in codigos_teste:
                        print(f"Linha PDF para {codigo_ibge}: UF={cod_uf} MUNIC={cod_mun} POP={pop}")
                    pop_str = str(pop).replace('.', '').replace(',', '').strip()
                    if pop_str.isdigit():
                        pop_int = int(pop_str)
                        pop_dict[codigo_ibge] = pop_int
                    else:
                        erros += 1
                except Exception as e:
                    erros += 1
    print(f'Foram extraídos {len(pop_dict)} municípios.')
    print(f'Linhas com erro: {erros}')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(pop_dict, f, ensure_ascii=False, indent=2)
    print(f'Arquivo gerado: {json_path}')
    return pop_dict

if __name__ == "__main__":
    if '--comparar' in sys.argv:
        pop_dict = extrai_populacao()
        comparar_com_municipios_json(pop_dict)
    else:
        extrai_populacao()

pop_dict = {}
erros = 0
