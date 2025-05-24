import pandas as pd

input_file = "./ai_predict/dataSus.txt"
output_file = "./ai_predict/dengue.csv"

# Read the tab-separated file, assuming no header and 4 columns
df = pd.read_csv(input_file, sep='\t', header=None, names=['regiao', 'estado', 'periodo', 'casos'], dtype=str)

# Strip whitespace
df['estado'] = df['estado'].str.strip()
df['periodo'] = df['periodo'].str.strip()
df['casos'] = df['casos'].str.strip()

# Remove thousand separator dots (e.g., 1.095 → 1095)
df['casos'] = df['casos'].str.replace('.', '', regex=False)

# Convert to integer
df['casos'] = pd.to_numeric(df['casos'], errors='coerce').fillna(0).astype(int)

# Map full state names to abbreviations
siglas = {
    "Acre": "AC", "Alagoas": "AL", "Amapa": "AP", "Amazonas": "AM", "Bahia": "BA", "Ceara": "CE",
    "Distrito Federal": "DF", "Espirito Santo": "ES", "Goias": "GO", "Maranhao": "MA", "Mato Grosso": "MT",
    "Mato Grosso Do Sul": "MS", "Minas Gerais": "MG", "Para": "PA", "Paraiba": "PB", "Parana": "PR",
    "Pernambuco": "PE", "Piaui": "PI", "Rio De Janeiro": "RJ", "Rio Grande Do Norte": "RN",
    "Rio Grande Do Sul": "RS", "Rondonia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
    "Sao Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO"
}

df['estado'] = df['estado'].map(siglas)

# Remove rows with unmapped states (if any)
df = df.dropna(subset=['estado'])

# Sort periodos (ano/semana) corretamente
df['periodo'] = pd.Categorical(df['periodo'], ordered=True,
    categories=sorted(df['periodo'].unique(), key=lambda x: (int(x.split('/')[0]), int(x.split('/')[1]))))

# Pivot: estados como linhas, períodos como colunas
pivot = df.pivot(index='estado', columns='periodo', values='casos').fillna(0).astype(int)

# Remover nome da coluna de períodos
pivot.columns.name = None

# Salvar como CSV final
pivot.to_csv(output_file, sep=',', index=True)

print("Arquivo gerado com sucesso!")
