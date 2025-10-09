# pip install pyarrow
import pandas as pd

#csv_path = '../final_training_data.csv'
#parquet_path = '../final_training_data.parquet'

#csv_path = '../dadosClimaticos.csv'
#parquet_path = '../dadosClimaticos.parquet'

#csv_path = '../inference_data.csv'
#parquet_path = '../inference_data.parquet'

csv_path = '../final_training_data_estadual.csv'
parquet_path = '../final_training_data_estadual.parquet'

# Compactar
#df = pd.read_csv(csv_path)
#df.to_parquet(parquet_path, index=False)

# Descompactar
df = pd.read_parquet(parquet_path)
df.to_csv(csv_path, index=False)

print("Conversão concluída!")
