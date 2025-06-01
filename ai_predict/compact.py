# pip install pyarrow
import pandas as pd

csv_path = 'ai_predict/data/dadosClimaticos.csv'
parquet_path = 'ai_predict/data/dadosClimaticos.parquet'

# Compactar
df = pd.read_csv(csv_path)
df.to_parquet(parquet_path, index=False)

# Descompactar
#df = pd.read_parquet(parquet_path)
#df.to_csv(csv_path, index=False)

print("Conversão concluída!")
