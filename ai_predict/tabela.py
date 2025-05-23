import pandas as pd

df = pd.read_csv('dados.csv', names=['estado', 'periodo', 'casos'])
df['casos'] = df['casos'].astype(str).str.replace('.', '', regex=False).str.replace(',', '.', regex=False).astype(float)

pivot = df.pivot(index='estado', columns='periodo', values='casos').fillna(0)
pivot.to_csv('tabela.csv')
