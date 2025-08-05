import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
import os

# Suas configurações
DATA_PATH = "../data/final_training_data.parquet"
MODEL_PATH = "modelo_lstm_casos_dengue.h5"
SEQUENCE_LENGTH = 12

def inverse_transform_cases(scaler, data, feature_index=0):
    """
    Desfaz a normalização apenas para a coluna 'numero_casos'.
    O scaler precisa das mesmas dimensões dos dados originais para funcionar.
    """
    dummy_data = np.zeros((len(data), scaler.n_features_in_))
    dummy_data[:, feature_index] = data
    inversed_data = scaler.inverse_transform(dummy_data)[:, feature_index]
    return inversed_data

# 1. Carregar o modelo e os dados originais
print("--- Carregando modelo e dados... ---")
if not os.path.exists(MODEL_PATH):
    print(f"Erro: O arquivo do modelo '{MODEL_PATH}' não foi encontrado. Certifique-se de que o modelo foi salvo após o treinamento.")
    exit()

model = load_model(MODEL_PATH)
df = pd.read_parquet(DATA_PATH)
df = df.sort_values(by=['municipio', 'ano', 'semana'])

# 2. Preparar os dados para a previsão
features = ['numero_casos', 'T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN']
data_for_lstm = df[features]
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(data_for_lstm)

municipios = df['municipio'].unique()
municipios_list = sorted(list(municipios))

# 3. Escolha do município
print("\n--- Selecione um município para a previsão ---")
num_to_list = min(100, len(municipios_list))
for i in range(num_to_list):
    print(f"{i+1:3d}: {municipios_list[i]}")

try:
    choice = int(input(f"\nDigite o número do município (1 a {num_to_list}): ")) - 1
    if 0 <= choice < num_to_list:
        selected_municipio = municipios_list[choice]
        print(f"Você selecionou: {selected_municipio}")
    else:
        print("Opção inválida. Saindo.")
        exit()
except ValueError:
    print("Entrada inválida. Por favor, digite um número. Saindo.")
    exit()

# 4. Fazer a previsão
print(f"--- Gerando previsões para {selected_municipio}... ---")

# Filtrar os dados do município escolhido
municipio_data = scaled_data[df['municipio'] == selected_municipio]
X_municipio = []
y_municipio = []

for i in range(len(municipio_data) - SEQUENCE_LENGTH):
    X_municipio.append(municipio_data[i:(i + SEQUENCE_LENGTH), :])
    y_municipio.append(municipio_data[i + SEQUENCE_LENGTH, 0])

if len(X_municipio) == 0:
    print("Dados insuficientes para fazer uma previsão para este município.")
    exit()

X_municipio = np.array(X_municipio)
y_municipio = np.array(y_municipio)

# Fazer a previsão
predictions_scaled = model.predict(X_municipio)

# Desfazer a normalização
predictions = inverse_transform_cases(scaler, predictions_scaled.flatten())
real_values = inverse_transform_cases(scaler, y_municipio)

# 5. Plotar o gráfico
print("\n--- Gerando gráfico de comparação... ---")

# Ajustar os dados para o plot
real_series = real_values
predicted_series = np.concatenate(([np.nan] * SEQUENCE_LENGTH, predictions))

# Criar a série de tempo para o plot
date_range = df[df['municipio'] == selected_municipio].index
plot_data_index = range(len(real_series))

plt.figure(figsize=(15, 7))
plt.plot(plot_data_index, real_series, label='Valores Reais', color='blue', marker='o', linestyle='--')
plt.plot(plot_data_index, predicted_series[SEQUENCE_LENGTH:], label='Previsão da IA', color='red', marker='x')
plt.title(f'Previsão de Casos de Dengue para {selected_municipio}')
plt.xlabel('Semanas')
plt.ylabel('Número de Casos')
plt.legend()
plt.grid(True)
plt.show()

print("\n--- Processo concluído. ---")