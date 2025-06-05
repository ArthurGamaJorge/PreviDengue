import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
import torch.nn as nn
import torch.optim as optim

# Parâmetros
input_length = 4   # janelas de input
output_length = 2  # previsão (pode ajustar)

# 1. Ler dados
df = pd.read_csv("tft.csv")
df["data"] = pd.to_datetime(df["data"])
df = df.sort_values(by=["estado", "data"]).reset_index(drop=True)

# 2. Função para criar sequências (X, y) para cada estado
def create_sequences(data, input_len, output_len):
    X, y = [], []
    for i in range(len(data) - input_len - output_len + 1):
        X.append(data[i:i+input_len])
        y.append(data[i+input_len:i+input_len+output_len])
    return np.array(X), np.array(y)

# 3. Preparar dados para todos os estados
X_list, y_list = [], []

for estado in df["estado"].unique():
    df_e = df[df["estado"] == estado].sort_values("data")
    series = df_e["casos"].values.astype(float)
    X_e, y_e = create_sequences(series, input_length, output_length)
    X_list.append(X_e)
    y_list.append(y_e)

X_all = np.concatenate(X_list, axis=0)
y_all = np.concatenate(y_list, axis=0)

# 4. Dataset PyTorch
class TimeSeriesDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32).unsqueeze(-1)  # (batch, seq_len, 1)
        self.y = torch.tensor(y, dtype=torch.float32)               # (batch, output_len)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

dataset = TimeSeriesDataset(X_all, y_all)
dataloader = DataLoader(dataset, batch_size=16, shuffle=True)

# 5. Modelo LSTM
class LSTMForecast(nn.Module):
    def __init__(self, input_size=1, hidden_size=32, num_layers=2, output_size=output_length):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.linear = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        _, (hn, _) = self.lstm(x)
        out = hn[-1]
        out = self.linear(out)
        return out

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = LSTMForecast().to(device)
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# 6. Treinamento
epochs = 100

for epoch in range(epochs):
    model.train()
    total_loss = 0
    for xb, yb in dataloader:
        xb, yb = xb.to(device), yb.to(device)
        optimizer.zero_grad()
        preds = model(xb)
        loss = criterion(preds, yb)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * xb.size(0)

    print(f"Epoch {epoch+1}/{epochs} - Loss: {total_loss/len(dataset):.4f}")

# 7. Salvar modelo
torch.save(model.state_dict(), "lstm_model.pth")


#Epoch 39/10000 - Loss:  297139220.4830
#Epoch 176/10000 - Loss: 293.528.649
#Epoch 177/10000 - Loss: 293502893.0089