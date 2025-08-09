import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
from tensorflow.keras.models import load_model

# --- Local paths config ---
DATA_PATH = "../data/final_training_data.parquet"
MODEL_PATH = "./checkpoints/model_checkpoint_best.keras"
SCALER_DIR = "./scalers/"
SEQUENCE_LENGTH = 12

def inverse_transform_cases(scaler, data, feature_index=0):
    """
    Inverse transform the scaled target (numero_casos) using the given scaler.
    """
    dummy_data = np.zeros((len(data), scaler.n_features_in_))
    dummy_data[:, feature_index] = data
    return scaler.inverse_transform(dummy_data)[:, feature_index]

def main():
    print("--- Loading model and data ---")
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model file '{MODEL_PATH}' not found.")
        return
    if not os.path.exists(DATA_PATH):
        print(f"Error: Data file '{DATA_PATH}' not found.")
        return

    model = load_model(MODEL_PATH)
    df = pd.read_parquet(DATA_PATH)

    # Check required columns
    for col in ['codigo_ibge', 'municipio', 'ano', 'semana']:
        if col not in df.columns:
            print(f"Error: Required column '{col}' not found in data.")
            return

    # Convert codigo_ibge to int (important for matching)
    df['codigo_ibge'] = df['codigo_ibge'].astype(int)

    # Sort data temporally per municipality
    df = df.sort_values(by=['codigo_ibge', 'ano', 'semana'])

    # Features used in training
    dynamic_features = [
        "numero_casos", "T2M", "T2M_MAX", "T2M_MIN",
        "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
    ]
    static_features = ["latitude", "longitude"]

    # Unique municipios with names, sorted by codigo_ibge
    municipios = df[['codigo_ibge', 'municipio']].drop_duplicates().sort_values('codigo_ibge').reset_index(drop=True)

    # Input IBGE code
    print("\n--- Enter the IBGE code of the municipality for prediction ---")
    try:
        input_code = int(input("Digite o código IBGE: ").strip())
    except ValueError:
        print("Invalid input. Please enter a valid integer IBGE code. Exiting.")
        return

    if input_code not in municipios['codigo_ibge'].values:
        print(f"IBGE code {input_code} not found in dataset. Exiting.")
        return

    selected_row = municipios[municipios['codigo_ibge'] == input_code].iloc[0]
    selected_municipio_code = selected_row['codigo_ibge']
    selected_municipio_name = selected_row['municipio']
    print(f"Selected municipality: {selected_municipio_code} - {selected_municipio_name}")

    # Filter data for selected municipio
    df_mun = df[df['codigo_ibge'] == selected_municipio_code]

    # Load scalers for this municipality
    scaler_dyn_path = os.path.join(SCALER_DIR, f"{selected_municipio_code}_dynamic.pkl")
    scaler_static_path = os.path.join(SCALER_DIR, f"{selected_municipio_code}_static.pkl")
    if not os.path.exists(scaler_dyn_path) or not os.path.exists(scaler_static_path):
        print(f"Scaler files for municipio {selected_municipio_code} not found. Cannot proceed.")
        return
    scaler_dyn = joblib.load(scaler_dyn_path)
    scaler_static = joblib.load(scaler_static_path)

    # Prepare dynamic data sequences (scaled)
    dynamic_data = df_mun[dynamic_features].values
    static_data = df_mun[static_features].iloc[0].values.reshape(1, -1)  # static data fixed for municipality
    static_scaled = scaler_static.transform(static_data)

    # Scale dynamic data using saved scaler (do NOT fit)
    dynamic_scaled = scaler_dyn.transform(dynamic_data)

    X_mun = []
    static_mun = []

    for i in range(len(dynamic_scaled) - SEQUENCE_LENGTH):
        X_mun.append(dynamic_scaled[i : i + SEQUENCE_LENGTH, :])
        static_mun.append(static_scaled[0])  # same static data for all sequences

    if len(X_mun) == 0:
        print("Not enough data to create sequences for prediction.")
        return

    X_mun = np.array(X_mun, dtype=np.float32)
    static_mun = np.array(static_mun, dtype=np.float32)

    # Predict
    predictions_scaled = model.predict([X_mun, static_mun], verbose=1).flatten()

    # True targets scaled
    y_true_scaled = dynamic_scaled[SEQUENCE_LENGTH:, 0]  # first feature is 'numero_casos'

    # Inverse transform both predictions and true values
    predictions = inverse_transform_cases(scaler_dyn, predictions_scaled)
    y_true = inverse_transform_cases(scaler_dyn, y_true_scaled)

    # Plot results
    import matplotlib.pyplot as plt
    plt.figure(figsize=(15, 7))
    plt.plot(range(len(y_true)), y_true, label="Real Cases", marker='o', linestyle='--', color='blue')
    plt.plot(range(len(predictions)), predictions, label="Predicted Cases", marker='x', color='red')
    plt.title(f"Dengue Cases Prediction for Municipality {selected_municipio_name} ({selected_municipio_code})")
    plt.xlabel("Weeks")
    plt.ylabel("Number of Cases")
    plt.legend()
    plt.grid(True)
    plt.show()

    print("\n--- Done ---")

if __name__ == "__main__":
    main()
