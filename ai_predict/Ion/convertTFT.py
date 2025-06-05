import pandas as pd

# Carrega o arquivo original
df = pd.read_csv('dengues.csv')

# Transforma de wide para long
df_long = df.melt(id_vars=['estado'], var_name='data', value_name='casos')

# Converte o campo 'data' (semana) para formato de data real (aproximado)
df_long['data'] = pd.to_datetime(df_long['data'] + '-1', format='%Y/%U-%w')

# Ordena
df_long = df_long.sort_values(['estado', 'data'])

# Salva no novo formato
df_long.to_csv('tft.csv', index=False)
