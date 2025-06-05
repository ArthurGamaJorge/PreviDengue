import pandas as pd
from pytorch_forecasting import TimeSeriesDataSet, TemporalFusionTransformer, QuantileLoss
from pytorch_forecasting.data import NaNLabelEncoder
from pytorch_lightning import Trainer
from pytorch_lightning.callbacks import EarlyStopping, LearningRateMonitor
import torch

# Carregar dados
df = pd.read_csv("tft.csv")
df["data"] = pd.to_datetime(df["data"])
df = df.sort_values(by=["estado", "data"]).reset_index(drop=True)
df["time_idx"] = df.groupby("estado").cumcount().astype(int)

# Verifica a menor quantidade de semanas disponíveis
semanas_por_estado = df.groupby("estado").size()
min_semanas = semanas_por_estado.min()

# Define janelas de input e previsão
max_prediction_length = 4
max_encoder_length = int(min(min_semanas - max_prediction_length, 52))

# Dataset para treino
training = TimeSeriesDataSet(
    df,
    time_idx="time_idx",
    target="casos",
    group_ids=["estado"],
    max_encoder_length=max_encoder_length,
    max_prediction_length=max_prediction_length,
    time_varying_known_reals=["time_idx"],  # usar time_idx aqui (não data)
    time_varying_unknown_reals=["casos"],
    categorical_encoders={"estado": NaNLabelEncoder().fit(df.estado)},
)

# DataLoader
train_dataloader = training.to_dataloader(train=True, batch_size=32, num_workers=0)

# Modelo TFT
tft = TemporalFusionTransformer.from_dataset(
    training,
    learning_rate=0.03,
    hidden_size=16,
    attention_head_size=1,
    dropout=0.1,
    loss=QuantileLoss(),
    log_interval=10,
    reduce_on_plateau_patience=4,
)

# Callbacks
early_stop_callback = EarlyStopping(monitor="val_loss", patience=5, mode="min")
lr_logger = LearningRateMonitor(logging_interval='epoch')

# Configurar dispositivo de forma simples, compatível com versões diferentes do pytorch_lightning
if torch.cuda.is_available():
    accelerator = "gpu"
    devices = 1
elif torch.backends.mps.is_available():
    accelerator = "mps"
    devices = 1
else:
    accelerator = "cpu"
    devices = None  # deixa default

trainer = Trainer(
    max_epochs=30,
    accelerator=accelerator,
    devices=devices,
    callbacks=[early_stop_callback, lr_logger],
)

# Treinar - passa o modelo direto
trainer.fit(tft, train_dataloaders=train_dataloader)
