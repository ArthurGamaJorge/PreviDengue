import requests
import csv
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

# URLs da API do IBGE
MUNICIPIOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
POPULACAO_URL = "https://servicodados.ibge.gov.br/api/v1/projecoes/populacao/{}"

# Baixa a lista de municípios
print("Baixando lista de municípios...")
resp = requests.get(MUNICIPIOS_URL)
resp.raise_for_status()
municipios = resp.json()

# Prepara lista para salvar
populacoes = []

def get_populacao(mun):
    codigo = mun.get('id')
    try:
        pop_resp = requests.get(POPULACAO_URL.format(codigo), timeout=5)
        if pop_resp.status_code == 200:
            pop_data = pop_resp.json()
            populacao = pop_data.get('projecao', {}).get('populacao', None)
        else:
            populacao = None
    except Exception:
        populacao = None
    return {
        'codigo_ibge': codigo,
        'populacao': populacao
    }

print("Consultando população de cada município em paralelo...")
populacoes = []
with ThreadPoolExecutor(max_workers=20) as executor:
    futures = [executor.submit(get_populacao, mun) for mun in municipios]
    for f in tqdm(as_completed(futures), total=len(futures), desc="Municípios", unit="município"):
        populacoes.append(f.result())

# Salva em CSV

csv_file = 'populacao_municipios.csv'
print(f"Salvando dados em {csv_file}...")
with open(csv_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['codigo_ibge', 'populacao'])
    writer.writeheader()
    for row in populacoes:
        writer.writerow(row)

print("Concluído!")
