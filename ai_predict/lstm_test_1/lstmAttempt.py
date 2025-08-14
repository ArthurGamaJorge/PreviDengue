import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.layers import LSTM, Dense, Input, Concatenate
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, Callback

class EpochSaver(Callback):
    def __init__(self, epoch_file_path):
        super().__init__()
        self.epoch_file_path = epoch_file_path

    def on_epoch_end(self, epoch, logs=None):
        # epoch é zero-based, salva como 1-based (época atual)
        with open(self.epoch_file_path, "w") as f:
            f.write(str(epoch))

# --- Local paths config ---
DATA_PATH = "../data/final_training_data.parquet"
TARGET_COLUMN = "numero_casos"
SEQUENCE_LENGTH = 12
CHECKPOINT_PATH = "checkpoints/model_checkpoint.keras"
EPOCH_TRACK_PATH = CHECKPOINT_PATH.replace(".keras", "_epoch.txt")
epoch_saver = EpochSaver(EPOCH_TRACK_PATH)
SCALER_DIR = "scalers/"
EPOCHS = 20
BATCH_SIZE = 64

# Create directories if they don't exist
os.makedirs(os.path.dirname(CHECKPOINT_PATH), exist_ok=True)
os.makedirs(SCALER_DIR, exist_ok=True)

def create_sequences(data: np.ndarray, sequence_length: int):
    """
    Generates sequences for time-series prediction.
    Target (y) is always the first column (numero_casos).
    """
    num_samples = data.shape[0] - sequence_length
    X = np.zeros((num_samples, sequence_length, data.shape[1]), dtype=np.float32)
    y = np.zeros((num_samples,), dtype=np.float32)
    for i in range(num_samples):
        X[i] = data[i : i + sequence_length]
        y[i] = data[i + sequence_length, 0]
    return X, y

def main():
    print("--- Step 1: Loading data ---")
    df = pd.read_parquet(DATA_PATH)
    df = df.sort_values(by=["codigo_ibge", "ano", "semana"])

    df["week_sin"] = np.sin(2 * np.pi * df["semana"] / 52)
    df["week_cos"] = np.cos(2 * np.pi * df["semana"] / 52)
    df["year_norm"] = (df["ano"] - df["ano"].min()) / (df["ano"].max() - df["ano"].min())

    dynamic_features = [
        "numero_casos", "T2M", "T2M_MAX", "T2M_MIN",
        "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN",
        "week_sin", "week_cos", "year_norm"
    ]
    
    static_features = ["latitude", "longitude"]

    municipios = df["codigo_ibge"].unique()
    checkpoint_exists = os.path.exists(CHECKPOINT_PATH)

    print("--- Step 2: Creating sequences, scaling and splitting per municipality ---")
    X_train_list, y_train_list = [], []
    X_test_list, y_test_list = [], []
    static_train_list, static_test_list = [], []

    for municipio_id in municipios:
        df_mun = df[df["codigo_ibge"] == municipio_id]

        # Dynamic data for LSTM input
        dynamic_data = df_mun[dynamic_features].values
        # Static data repeated per timestep sequence
        static_data = df_mun[static_features].iloc[0].values.reshape(1, -1)  # (1, 2)

        # Create sequences for dynamic data
        X_mun_raw, y_mun_raw = create_sequences(dynamic_data, SEQUENCE_LENGTH)

        # Repeat static data per sequence
        static_seq = np.repeat(static_data, len(X_mun_raw), axis=0)  # shape (num_sequences, 2)

        # Temporal split 80/20 per municipio
        split_idx = int(len(X_mun_raw) * 0.8)
        X_train_raw, y_train_raw, static_train = (
            X_mun_raw[:split_idx], y_mun_raw[:split_idx], static_seq[:split_idx]
        )
        X_test_raw, y_test_raw, static_test = (
            X_mun_raw[split_idx:], y_mun_raw[split_idx:], static_seq[split_idx:]
        )

        # Scale dynamic data
        nsamples_train, seq_len, nfeatures_dyn = X_train_raw.shape
        X_train_2d = X_train_raw.reshape((nsamples_train * seq_len, nfeatures_dyn))
        scaler_dyn = MinMaxScaler()
        scaler_dyn.fit(X_train_2d)

        X_train_scaled = scaler_dyn.transform(X_train_2d).reshape((nsamples_train, seq_len, nfeatures_dyn))
        nsamples_test = X_test_raw.shape[0]
        X_test_2d = X_test_raw.reshape((nsamples_test * seq_len, nfeatures_dyn))
        X_test_scaled = scaler_dyn.transform(X_test_2d).reshape((nsamples_test, seq_len, nfeatures_dyn))

        # Scale static data (fit only on train static)
        scaler_static = MinMaxScaler()
        scaler_static.fit(static_train)
        
        joblib.dump(scaler_dyn, os.path.join(SCALER_DIR, f"{municipio_id}_dynamic.pkl"))
        joblib.dump(scaler_static, os.path.join(SCALER_DIR, f"{municipio_id}_static.pkl"))
        print(f"[Scaler] Saved dynamic and static scalers for municipio {municipio_id}")
        
        static_train_scaled = scaler_static.transform(static_train)
        static_test_scaled = scaler_static.transform(static_test)

        # Scale targets y (using dynamic scaler on first feature)
        y_train_scaled = scaler_dyn.transform(
            y_train_raw.reshape(-1, 1).repeat(nfeatures_dyn, axis=1)
        )[:, 0]
        y_test_scaled = scaler_dyn.transform(
            y_test_raw.reshape(-1, 1).repeat(nfeatures_dyn, axis=1)
        )[:, 0]

        # Append to lists
        X_train_list.append(X_train_scaled)
        y_train_list.append(y_train_scaled)
        X_test_list.append(X_test_scaled)
        y_test_list.append(y_test_scaled)
        static_train_list.append(static_train_scaled)
        static_test_list.append(static_test_scaled)

    # Concatenate all municipios
    X_train = np.concatenate(X_train_list, axis=0)
    y_train = np.concatenate(y_train_list, axis=0)
    X_test = np.concatenate(X_test_list, axis=0)
    y_test = np.concatenate(y_test_list, axis=0)
    static_train = np.concatenate(static_train_list, axis=0)
    static_test = np.concatenate(static_test_list, axis=0)

    print(f"Train sequences: {X_train.shape[0]}, Test sequences: {X_test.shape[0]}")
    print(f"X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
    print(f"X_test shape: {X_test.shape}, y_test shape: {y_test.shape}")
    print(f"Static train shape: {static_train.shape}, Static test shape: {static_test.shape}")

    print("--- Step 3: Loading or creating model ---")
    initial_epoch = 0
    if checkpoint_exists:
        model = load_model(CHECKPOINT_PATH)
        if os.path.exists(EPOCH_TRACK_PATH):
            with open(EPOCH_TRACK_PATH, "r") as f:
                initial_epoch = int(f.read().strip()) + 1
        print(f"Resuming from epoch {initial_epoch}")
    else:
        input_dyn = Input(shape=(SEQUENCE_LENGTH, len(dynamic_features)))
        lstm_out = LSTM(50, return_sequences=True)(input_dyn)
        lstm_out = LSTM(50)(lstm_out)

        input_static = Input(shape=(len(static_features),))

        concat = Concatenate()([lstm_out, input_static])
        output = Dense(1, activation="relu")(concat)

        model = Model(inputs=[input_dyn, input_static], outputs=output)
        model.compile(optimizer="adam", loss="mean_squared_error")
        print("Created new model")

    early_stopping = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    checkpoint_last = ModelCheckpoint(
        filepath=CHECKPOINT_PATH,
        save_best_only=False,
        save_freq="epoch",
        verbose=1,
    )
    checkpoint_best = ModelCheckpoint(
        filepath=CHECKPOINT_PATH.replace(".keras", "_best.keras"),
        save_best_only=True,
        monitor="val_loss",
        mode="min",
        verbose=1,
    )

    print("--- Step 4: Training model ---")
    history = model.fit(
        [X_train, static_train], y_train,
        validation_data=([X_test, static_test], y_test),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stopping, checkpoint_last, checkpoint_best, epoch_saver],
        initial_epoch=initial_epoch,
        verbose=1,
    )

    print("--- Training finished ---")

if __name__ == "__main__":
    main()

