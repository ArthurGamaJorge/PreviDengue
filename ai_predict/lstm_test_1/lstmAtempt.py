import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import EarlyStopping
import os

# Adicione estas linhas para corrigir o problema de mutex
os.environ['TF_NUM_INTEROP_THREADS'] = '1'
os.environ['TF_NUM_INTRAOP_THREADS'] = '1'

# Suas configurações
DATA_PATH = "../data/final_training_data.parquet"
TARGET_COLUMN = "numero_casos"
SEQUENCE_LENGTH = 12


def create_sequences(data, sequence_length):
    """
    Cria sequências de dados para o modelo LSTM.
    X terá os dados de 'sequence_length' semanas, e y terá os dados da próxima semana.
    """
    X, y = [], []
    for i in range(len(data) - sequence_length):
        X.append(data[i:(i + sequence_length), :])
        y.append(data[i + sequence_length, 0])  # A coluna 0 é a 'numero_casos'
    return np.array(X), np.array(y)

# 1. Carregar e pré-processar os dados
print("--- Passo 1: Carregando e pré-processando os dados... ---")
df = pd.read_parquet(DATA_PATH)

# Ordenar por município, ano e semana para garantir a sequência temporal
df = df.sort_values(by=['municipio', 'ano', 'semana'])

# Selecionar as colunas que serão usadas
features = ['numero_casos', 'T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN']
data_for_lstm = df[features]

# Normalizar os dados numéricos
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(data_for_lstm)

# 2. Criar sequências de dados para o LSTM (separado por município)
print("--- Passo 2: Criando sequências de dados para cada município... ---")
X, y = [], []
for municipio in df['municipio'].unique():
    municipio_data = scaled_data[df['municipio'] == municipio]
    X_municipio, y_municipio = create_sequences(municipio_data, SEQUENCE_LENGTH)
    X.append(X_municipio)
    y.append(y_municipio)

X = np.concatenate(X)
y = np.concatenate(y)

# 3. Separar em dados de treino e teste
print(f"--- Passo 3: Separando dados (X, y) em treino e teste... ---")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Shape de X_train: {X_train.shape}")
print(f"Shape de y_train: {y_train.shape}")
print(f"Shape de X_test: {X_test.shape}")
print(f"Shape de y_test: {y_test.shape}")

# 4. Construir o modelo LSTM
print("\n--- Passo 4: Construindo e treinando o modelo LSTM... ---")
model = Sequential()
model.add(LSTM(units=50, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])))
model.add(LSTM(units=50, return_sequences=False))
model.add(Dense(units=1))

model.compile(optimizer='adam', loss='mean_squared_error')

# 5. Treinar o modelo
history = model.fit(X_train, y_train, epochs=20, batch_size=64, validation_data=(X_test, y_test), callbacks=[EarlyStopping(monitor='val_loss', patience=3)])

print("\n--- Treinamento do modelo concluído. ---")