import pandas as pd
import torch
from lightning.pytorch import Trainer
from pytorch_forecasting import TimeSeriesDataSet, TemporalFusionTransformer, Baseline
from pytorch_forecasting.data import NaNLabelEncoder
from pytorch_forecasting.metrics import SMAPE
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
import sys
from pytorch_forecasting.data import GroupNormalizer

# ==== PARÂMETROS ====
ARQUIVO = "../data/final_training_data.csv"
MUNICIPIO = "Campinas"  # altere conforme necessário
MAX_EPOCHS = 2  # ajuste conforme necessário

# ==== CARREGAR DADOS ====
df = pd.read_csv(ARQUIVO)

# ==== FILTRAR MUNICÍPIO ====
df = df[df["municipio"] == MUNICIPIO].copy()

# ==== PRÉ-PROCESSAMENTO ====
df = df.sort_values(["municipio", "ano", "semana"])
df["time_idx"] = df.groupby("municipio").cumcount()

df["numero_casos"] = df["numero_casos"].astype(float)

print(df)

# ==== DEFINIR CAMPOS ====
max_encoder_length = 52
max_prediction_length = 52

training_cutoff = df["time_idx"].max() - max_prediction_length


training = TimeSeriesDataSet(
    df[lambda x: x.time_idx <= training_cutoff],
    time_idx="time_idx",
    target="numero_casos",
    group_ids=["municipio"],
    max_encoder_length=max_encoder_length,
    max_prediction_length=max_prediction_length,
    time_varying_unknown_reals=["numero_casos"],
    time_varying_known_reals=["time_idx", "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"],
    static_categoricals=["municipio"],
    target_normalizer=GroupNormalizer(groups=["municipio"]),  # CORREÇÃO AQUI
)


validation = TimeSeriesDataSet.from_dataset(training, df, predict=True, stop_randomization=True)

# ==== LOADERS ====
train_dataloader = training.to_dataloader(train=True, batch_size=64, num_workers=0)
val_dataloader = validation.to_dataloader(train=False, batch_size=64, num_workers=0)

# ==== MODELO ====
tft = TemporalFusionTransformer.from_dataset(
    training,
    learning_rate=0.03,
    hidden_size=16,
    attention_head_size=1,
    dropout=0.1,
    loss=SMAPE(),
    log_interval=10,
    reduce_on_plateau_patience=2,
)

# ==== TREINAR ====
trainer = Trainer(max_epochs=MAX_EPOCHS, accelerator="auto")

trainer.fit(model=tft, train_dataloaders=train_dataloader, val_dataloaders=val_dataloader)

# ==== PREVER ====


from pytorch_forecasting import TimeSeriesDataSet

# preparar dataset para previsão das últimas 4 semanas
ultima_janela = df[df.time_idx > training_cutoff - max_encoder_length]
dataset_pred = TimeSeriesDataSet.from_dataset(training, ultima_janela, predict=True, stop_randomization=True)
loader_pred = dataset_pred.to_dataloader(train=False, batch_size=1, num_workers=0)

# obter previsão (4 pontos)
pred = tft.predict(loader_pred)
valores_pred = pred[0].cpu().numpy()
#valores_pred = valores_pred.clip(min=0)



# extrair os 4 time_idx previstos
idx_prev = list(range(training_cutoff + 1, training_cutoff + 1 + max_prediction_length))

df_prev = df[df.time_idx.isin(idx_prev)].copy()
df_prev["ano_semana"] = df_prev["ano"].astype(str) + "-W" + df_prev["semana"].astype(str).str.zfill(2)
df_prev = df_prev.drop_duplicates(subset="time_idx")[["time_idx", "ano_semana"]]



df_prev["previsto"] = valores_pred
# Criar a coluna ano_semana no df original
df["ano_semana"] = df["ano"].astype(str) + "-W" + df["semana"].astype(str).str.zfill(2)

# Plotar gráfico
plt.figure(figsize=(15,6))
plt.plot(df['ano_semana'], df['numero_casos'], label='Casos reais')
plt.plot(df_prev['ano_semana'], df_prev['previsto'], color='orange', label='Previsão')
step = max(len(df)//15, 1)
plt.xticks(ticks=range(0, len(df), step), labels=df['ano_semana'].iloc[::step], rotation=45)
plt.xlabel('Ano-Semana')
plt.ylabel('Número de casos')
plt.title('Casos reais e previsão')
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()
