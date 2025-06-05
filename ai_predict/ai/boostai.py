import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
import matplotlib.pyplot as plt

df = pd.read_csv("../data/final_training_data.csv")
df = df[df["municipio"] == "Campinas"]
df = df.sort_values(["ano", "semana"]).reset_index(drop=True)

data = df["numero_casos"].values

def create_lag_features(data, lags=52):
    X, y = [], []
    for i in range(lags, len(data)):
        X.append(data[i-lags:i])
        y.append(data[i])
    return np.array(X), np.array(y)

lags = 52
X, y = create_lag_features(data, lags)

split_idx = int(len(X)*0.8)
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

y_pred_test = model.predict(X_test)
print(f"MSE Teste: {mean_squared_error(y_test, y_pred_test):.3f}")
print(f"MAE Teste: {mean_absolute_error(y_test, y_pred_test):.3f}")

last_seq = data[-lags:].tolist()
future_preds = []
n = 500

for _ in range(n):
    pred = model.predict(np.array(last_seq[-lags:]).reshape(1, -1))[0]
    pred = max(pred, 0)
    future_preds.append(pred)
    last_seq.append(pred)

plt.figure(figsize=(10,6))
plt.plot(range(len(data)), data, label="Real")
plt.plot(range(len(data), len(data)+n), future_preds, linestyle='--', label="Previsão 50 semanas")
plt.xlabel("Semanas")
plt.ylabel("Número de Casos")
plt.title("Previsão Simples Sazonal de Dengue - Campinas")
plt.legend()
plt.show()
