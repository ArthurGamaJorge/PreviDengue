import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import joblib  # salvar e carregar scalers

# Configurações
DATA_PATH = "../data/final_training_data.parquet"
TARGET_COLUMN = "numero_casos"
SEQUENCE_LENGTH = 12
CHECKPOINT_PATH = "checkpoints/model_checkpoint.keras"
EPOCH_TRACK_PATH = CHECKPOINT_PATH.replace(".keras", "_epoch.txt")
SCALER_DIR = "scalers/"
EPOCHS = 20
BATCH_SIZE = 64

# Cria pastas se não existirem
os.makedirs(os.path.dirname(CHECKPOINT_PATH), exist_ok=True)
os.makedirs(SCALER_DIR, exist_ok=True)

def create_sequences(data: np.ndarray, sequence_length: int):
    """
    Cria pares de (X, y) com base em sequência de tamanho 'sequence_length'.
    y é o próximo valor da coluna 0 (numero_casos).
    """
    num_samples = data.shape[0] - sequence_length
    X = np.zeros((num_samples, sequence_length, data.shape[1]), dtype=np.float32)
    y = np.zeros((num_samples,), dtype=np.float32)
    for i in range(num_samples):
        X[i] = data[i : i + sequence_length]
        y[i] = data[i + sequence_length, 0]
    return X, y

def load_or_create_scaler(municipio: str, data: np.ndarray, scaler_dir: str, use_saved: bool):
    """
    Carrega scaler salvo se existir e use_saved==True, senão cria e salva novo scaler.
    """
    scaler_path = os.path.join(scaler_dir, f"{municipio}.pkl")
    assert os.path.exists(scaler_path), f"Scaler ausente para {municipio}"
    if use_saved and os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)
        scaled_data = scaler.transform(data)
        print(f"[Scaler] Carregado para município {municipio}")
    else:
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(data)
        joblib.dump(scaler, scaler_path)
        print(f"[Scaler] Criado e salvo para município {municipio}")
    return scaled_data

def main():
    print("--- Passo 1: Carregando dados ---")
    df = pd.read_parquet(DATA_PATH)
    df = df.sort_values(by=["municipio", "ano", "semana"])

    features = ['numero_casos', 'T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN']
    municipios = df['municipio'].unique()

    checkpoint_exists = os.path.exists(CHECKPOINT_PATH)

    print("--- Passo 2: Criando sequências por município ---")
    X_list, y_list = [], []

    for municipio in municipios:
        df_mun = df[df['municipio'] == municipio]
        data_mun = df_mun[features].values

        scaled_data = load_or_create_scaler(municipio, data_mun, SCALER_DIR, checkpoint_exists)

        X_mun, y_mun = create_sequences(scaled_data, SEQUENCE_LENGTH)
        X_list.append(X_mun)
        y_list.append(y_mun)

    # Concatena sequências de todos os municípios
    X = np.concatenate(X_list, axis=0)
    y = np.concatenate(y_list, axis=0)

    print(f"Total sequências: {X.shape[0]}")

    print("--- Passo 3: Dividindo dados temporalmente ---")
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
    print(f"X_test shape: {X_test.shape}, y_test shape: {y_test.shape}")

    print("--- Passo 4: Carregando modelo ou criando novo ---")
    initial_epoch = 0
    if checkpoint_exists:
        model = load_model(CHECKPOINT_PATH)
        if os.path.exists(EPOCH_TRACK_PATH):
            with open(EPOCH_TRACK_PATH, "r") as f:
                initial_epoch = int(f.read().strip()) + 1
        print(f"Checkpoint encontrado, retomando do epoch {initial_epoch}")
    else:
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
            LSTM(50),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mean_squared_error')
        print("Novo modelo criado")

    early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    checkpoint = ModelCheckpoint(filepath=CHECKPOINT_PATH, save_best_only=False, save_freq='epoch')

    print("--- Passo 5: Treinando modelo ---")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stopping, checkpoint],
        initial_epoch=initial_epoch,
        verbose=1  # mostra barra de progresso
    )

    # Salva a última época treinada (último epoch completado)
    with open(EPOCH_TRACK_PATH, "w") as f:
        f.write(str(initial_epoch + len(history.epoch) - 1))

    print("--- Treinamento finalizado ---")

if __name__ == "__main__":
    main()
