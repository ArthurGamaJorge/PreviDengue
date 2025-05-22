import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import LabelEncoder

# Config
FUTURAS_SEMANAS = 5  # semanas para prever

# Carregar os dados
with open('dados.json', 'r', encoding='utf-8') as f:
    dados = json.load(f)

# Converter para DataFrame
df = pd.DataFrame(dados)

# Codificar regiões e semanas
le_regiao = LabelEncoder()
le_semana = LabelEncoder()

df['regiao_enc'] = le_regiao.fit_transform(df['regiao'])
df['semana_num'] = df['semana'].str.extract(r'(\d+)').astype(int)

# Prever por região
regioes = df['regiao'].unique()

for regiao in regioes:
    df_reg = df[df['regiao'] == regiao].sort_values('semana_num')

    X = df_reg[['semana_num']]
    y = df_reg['casos']

    model = MLPRegressor(hidden_layer_sizes=(50, 50), max_iter=1000, random_state=0)
    model.fit(X, y)

    # Prever valores existentes + futuras semanas
    semanas_existentes = df_reg['semana_num'].tolist()
    semanas_futuras = list(range(max(semanas_existentes) + 1, max(semanas_existentes) + FUTURAS_SEMANAS + 1))

    X_all = np.array(semanas_existentes + semanas_futuras).reshape(-1, 1)
    y_pred = model.predict(X_all)

    # Plot
    plt.figure(figsize=(10, 4))
    plt.plot(semanas_existentes, y.tolist(), label='Reais', marker='o')
    plt.plot(X_all.ravel(), y_pred, label='Previsto', marker='x', linestyle='--')
    plt.axvline(x=max(semanas_existentes), color='gray', linestyle=':', label='Hoje')
    plt.title(f'Região: {regiao} - Previsão de casos')
    plt.xlabel('Semana')
    plt.ylabel('Casos')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()

# Prever o total nacional
df_total = df.groupby('semana_num')['casos'].sum().reset_index()
X = df_total[['semana_num']]
y = df_total['casos']

model_total = MLPRegressor(hidden_layer_sizes=(50, 50), max_iter=1000, random_state=1)
model_total.fit(X, y)

semanas_existentes = df_total['semana_num'].tolist()
semanas_futuras = list(range(max(semanas_existentes) + 1, max(semanas_existentes) + FUTURAS_SEMANAS + 1))
X_all = np.array(semanas_existentes + semanas_futuras).reshape(-1, 1)
y_pred = model_total.predict(X_all)

plt.figure(figsize=(10, 4))
plt.plot(semanas_existentes, y.tolist(), label='Reais', marker='o')
plt.plot(X_all.ravel(), y_pred, label='Previsto', marker='x', linestyle='--')
plt.axvline(x=max(semanas_existentes), color='gray', linestyle=':', label='Hoje')
plt.title('Total Nacional - Previsão de Casos')
plt.xlabel('Semana')
plt.ylabel('Casos')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
