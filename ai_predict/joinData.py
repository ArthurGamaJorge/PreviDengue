import csv
import json
import os
from glob import glob

def load_estados(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        estados = json.load(f)
    # Criar um dict: codigo_uf -> uf (sigla)
    return {e['codigo_uf']: e['uf'] for e in estados}

def load_municipios(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        municipios = json.load(f)
    # Criar dict codigo_ibge -> dados municipio
    return {m['codigo_ibge']: m for m in municipios}

def wide_to_long(csv_filename, municipios_dict, estados_dict):
    # Extrair ano do nome do arquivo, ex: mun2016.csv -> 2016
    basename = os.path.basename(csv_filename)
    year_part = ''.join(filter(str.isdigit, basename))
    ano = int(year_part)

    with open(csv_filename, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
        rows_long = []
        for row in reader:
            # Exemplo linha:
            # "110002 ARIQUEMES";-;4;1;2;2;1;-;-;2;1;2;1;...
            # Primeira coluna tem código e nome juntos, separados por espaço
            cod_nome = row[0].strip('"')
            parts = cod_nome.split(' ', 1)
            if len(parts) < 2:
                continue  # linha inválida
            codigo_ibge_str, municipio_nome = parts[0], parts[1]
            try:
                codigo_ibge = int(codigo_ibge_str)
            except:
                continue

            if codigo_ibge not in municipios_dict:
                # Sem dados para esse município no json, pula
                continue
            
            municipio_info = municipios_dict[codigo_ibge]
            latitude = municipio_info['latitude']
            longitude = municipio_info['longitude']
            codigo_uf = municipio_info['codigo_uf']
            estado = estados_dict.get(codigo_uf, 'NA')

            # Dados semanais começam na coluna 1 até 52 (ou o que tiver)
            # Considerando que tem 52 semanas, index 1 a 52
            for semana in range(1, 53):
                # Evitar index error
                if semana >= len(row):
                    break
                valor = row[semana].strip()
                if valor == '-' or valor == '':
                    numero_casos = 0
                else:
                    try:
                        numero_casos = int(valor)
                    except:
                        numero_casos = 0
                notificacao = 1 if numero_casos > 0 else 0

                rows_long.append({
                    'codigo_ibge': codigo_ibge,
                    'municipio': municipio_nome,
                    'estado': estado,
                    'latitude': latitude,
                    'longitude': longitude,
                    'semana': semana,
                    'ano': ano,
                    'numero_casos': numero_casos,
                    'notificacao': notificacao
                })

    return rows_long

def process_all_files(mun_files_pattern, estados_json, municipios_json):
    estados_dict = load_estados(estados_json)
    municipios_dict = load_municipios(municipios_json)

    all_data = []
    files = sorted(glob(mun_files_pattern))
    for f in files:
        print(f'Processing {f}...')
        data_long = wide_to_long(f, municipios_dict, estados_dict)
        all_data.extend(data_long)
    return all_data

def save_to_csv(data, output_filename):
    keys = ['codigo_ibge','municipio','estado','latitude','longitude','semana','ano','numero_casos','notificacao']
    with open(output_filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for row in data:
            writer.writerow(row)

# --- Usage example ---
if __name__ == '__main__':
    # Ajuste o path para seus arquivos
    mun_files_pattern = 'mun*.csv'  # todos os mun*.csv na pasta atual
    estados_json = './data/prev/estados.json'
    municipios_json = './data/prev/municipios.json'
    output_csv = 'dataDengue.csv'

    dataset = process_all_files(mun_files_pattern, estados_json, municipios_json)
    save_to_csv(dataset, output_csv)
    print(f'Data saved to {output_csv}')
