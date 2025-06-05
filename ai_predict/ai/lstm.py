import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
import matplotlib.pyplot as plt

df = pd.read_csv("../data/final_training_data.csv")
df = df[df["municipio"] == "Campinas"]
df = df.sort_values(["ano", "semana"])
data = df["numero_casos"].values.reshape(-1, 1)

scaler = MinMaxScaler()
scaled = scaler.fit_transform(data)

def create_sequences(data_array, seq_len):
    X, y = [], []
    for i in range(len(data_array) - seq_len):
        X.append(data_array[i : i + seq_len])
        y.append(data_array[i + seq_len])
    return np.array(X), np.array(y)

seq_len = 52
X, y = create_sequences(scaled, seq_len)

split_idx = int(len(X) * 0.8)
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

model = Sequential()
model.add(LSTM(50, input_shape=(seq_len, 1)))
model.add(Dense(1))
model.compile(optimizer="adam", loss="mse")
model.fit(X_train, y_train, epochs=20, batch_size=16, verbose=1)

last_seq = scaled[-seq_len:]
future_preds = []
current_seq = last_seq.copy()

for _ in range(50):
    pred = model.predict(current_seq.reshape(1, seq_len, 1))
    future_preds.append(pred[0, 0])
    current_seq = np.roll(current_seq, -1)
    current_seq[-1] = pred

future = scaler.inverse_transform(np.array(future_preds).reshape(-1, 1)).flatten()

plt.figure(figsize=(10, 6))
plt.plot(range(len(data)), data.flatten(), label="Real")
plt.plot(range(len(data), len(data) + 50), future, label="Previsão 50 Semanas")
plt.xlabel("Semanas")
plt.ylabel("Número de Casos")
plt.legend()
plt.show()
