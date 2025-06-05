import pandas as pd
import numpy as np
import torch
import matplotlib.pyplot as plt

# Parâmetros (devem ser iguais do treino)
input_length = 4
output_length = 2

# Dataset e modelo iguais ao do treino (definir a classe LSTMForecast)
class LSTMForecast(torch.nn.Module):
    def __init__(self, input_size=1, hidden_size=32, num_layers=2, output_size=output_length):
        super().__init__()
        self.lstm = torch.nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.linear = torch.nn.Linear(hidden_size, output_size)

    def forward(self, x):
        _, (hn, _) = self.lstm(x)
        out = hn[-1]
        out = self.linear(out)
        return out

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 1. Ler dados originais
df = pd.read_csv("tft.csv")
df["data"] = pd.to_datetime(df["data"])
df = df.sort_values(by=["estado", "data"]).reset_index(drop=True)

# 2. Carregar modelo salvo
model = LSTMForecast().to(device)
model.load_state_dict(torch.load("lstm_model.pth"))
model.eval()

# 3. Função para fazer previsão recursiva
def predict_recursive(model, input_seq, steps):
    model.eval()
    preds = []
    seq = input_seq.clone().detach()
    for _ in range(steps):
        with torch.no_grad():
            pred = model(seq.unsqueeze(0).unsqueeze(-1).to(device))  # (1, output_length)
        pred_val = pred[0, 0].cpu().item()
        preds.append(pred_val)
        # atualizar sequência removendo o primeiro e adicionando a previsão no final
        seq = torch.cat((seq[1:], torch.tensor([pred_val])))
    return preds

# 4. Plotar para cada estado
import matplotlib.dates as mdates

for estado in df["estado"].unique():
    df_e = df[df["estado"] == estado].sort_values("data")
    series = torch.tensor(df_e["casos"].values, dtype=torch.float32)
    dates = df_e["data"].values

    plt.figure(figsize=(12,6))
    plt.plot(dates, series.numpy(), label="Dados reais")

    # Previsão durante a série: previsão para cada ponto possível com janela input_length
    preds_durante = []
    preds_dates = []
    for i in range(len(series) - input_length - output_length + 1):
        input_seq = series[i:i+input_length]
        with torch.no_grad():
            pred = model(input_seq.unsqueeze(0).unsqueeze(-1).to(device))
        preds_durante.append(pred[0,0].cpu().item())
        preds_dates.append(dates[i+input_length])

    plt.plot(preds_dates, preds_durante, label="Previsão durante", linestyle="--")

    # Previsão após última data (extrapolação)
    last_input = series[-input_length:]
    preds_apos = predict_recursive(model, last_input, steps=output_length)
    last_date = dates[-1]
    future_dates = pd.date_range(start=last_date + pd.Timedelta(days=7), periods=output_length, freq='7D')
    plt.plot(future_dates, preds_apos, label="Previsão após", linestyle=":")

    plt.title(f"Estado: {estado}")
    plt.xlabel("Data")
    plt.ylabel("Casos")
    plt.legend()
    plt.grid(True)
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
