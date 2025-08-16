import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
from tensorflow.keras.models import load_model

# --- Config paths ---
DATA_PATH = "../data/final_training_data.parquet"
MODEL_PATH = "./checkpoints/model_checkpoint_best.keras"
SCALER_DIR = "./scalers/"
SEQUENCE_LENGTH = 12
TEST_RATIO = 0.2
EXTRA_RATIO = 0.2  # % adicional de projeção

def inverse_transform_cases(scaler, data, feature_index=0):
    """Inverse transform only the target column (numero_casos) from scaled data."""
    dummy = np.zeros((len(data), scaler.n_features_in_))
    dummy[:, feature_index] = data
    return scaler.inverse_transform(dummy)[:, feature_index]

def main():
    # --- Load model and data ---
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model '{MODEL_PATH}' not found.")
        return
    if not os.path.exists(DATA_PATH):
        print(f"Error: Data '{DATA_PATH}' not found.")
        return

    model = load_model(MODEL_PATH)
    df = pd.read_parquet(DATA_PATH)

    # Ensure types and sort
    df['codigo_ibge'] = df['codigo_ibge'].astype(int)
    df = df.sort_values(by=['codigo_ibge', 'ano', 'semana'])

    dynamic_features = [
        "numero_casos", "T2M", "T2M_MAX", "T2M_MIN",
        "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]
    static_features = ["latitude", "longitude"]

    # Select municipality
    municipios = df[['codigo_ibge', 'municipio']].drop_duplicates().sort_values('codigo_ibge')
    try:
        input_code = int(input("Digite o código IBGE: ").strip())
    except ValueError:
        print("Código inválido.")
        return
    if input_code not in municipios['codigo_ibge'].values:
        print("Município não encontrado.")
        return

    selected_name = municipios[municipios['codigo_ibge'] == input_code].iloc[0]['municipio']
    df_mun = df[df['codigo_ibge'] == input_code].copy()

    # Load scalers
    scaler_dyn = joblib.load(os.path.join(SCALER_DIR, f"{input_code}_dynamic.pkl"))
    scaler_static = joblib.load(os.path.join(SCALER_DIR, f"{input_code}_static.pkl"))

    # Scale data
    dynamic_scaled = scaler_dyn.transform(df_mun[dynamic_features].values)
    static_scaled = scaler_static.transform(df_mun[static_features].iloc[0].values.reshape(1, -1))

    total_len = len(dynamic_scaled)
    train_size = int(total_len * (1 - TEST_RATIO))
    extra_steps = int(total_len * EXTRA_RATIO)

    # --- Test prediction ---
    history_data = dynamic_scaled[:train_size].tolist()
    preds_scaled = []

    for step in range(train_size, total_len):
        seq_input = np.array(history_data[-SEQUENCE_LENGTH:]).reshape(1, SEQUENCE_LENGTH, -1)
        pred_scaled = model.predict([seq_input, static_scaled], verbose=0)[0][0]
        preds_scaled.append(pred_scaled)

        # Próxima semana: usa clima real mas casos previstos
        next_week_features = dynamic_scaled[step].copy()
        next_week_features[0] = pred_scaled
        history_data.append(next_week_features)

    # --- Extra forecast without climate data ---
    extra_preds_scaled = []
    last_known_climate = history_data[-1][1:]  # ignora numero_casos
    for _ in range(extra_steps):
        seq_input = np.array(history_data[-SEQUENCE_LENGTH:]).reshape(1, SEQUENCE_LENGTH, -1)
        pred_scaled = model.predict([seq_input, static_scaled], verbose=0)[0][0]
        extra_preds_scaled.append(pred_scaled)

        # Mantém clima congelado e substitui casos
        next_week_features = np.array([pred_scaled] + list(last_known_climate))
        history_data.append(next_week_features)

    # --- Inverse transforms ---
    y_train_true = inverse_transform_cases(scaler_dyn, dynamic_scaled[:train_size, 0])
    y_test_true = inverse_transform_cases(scaler_dyn, dynamic_scaled[train_size:, 0])
    y_test_pred = inverse_transform_cases(scaler_dyn, np.array(preds_scaled))
    y_extra_pred = inverse_transform_cases(scaler_dyn, np.array(extra_preds_scaled))

    # --- Plot ---
    plt.figure(figsize=(15, 7))
    plt.plot(range(train_size), y_train_true, label="Train (Real)", color='blue')
    plt.plot(range(train_size, total_len), y_test_true, label="Test (Real)", color='green')
    plt.plot(range(train_size, total_len), y_test_pred, label="Test (Predicted)", color='red', linestyle='--')
    plt.plot(range(total_len, total_len + extra_steps), y_extra_pred, label="Extra Forecast", color='orange', linestyle='--')

    plt.axvline(x=train_size, color='black', linestyle=':', linewidth=2, label="Train/Test Split")
    plt.axvline(x=total_len, color='purple', linestyle=':', linewidth=2, label="Test/Extra Split")

    plt.title(f"Dengue Cases Prediction - {selected_name} ({input_code})")
    plt.xlabel("Weeks")
    plt.ylabel("Number of Cases")
    plt.legend()
    plt.grid(True)
    plt.show()

if __name__ == "__main__":
    main()
