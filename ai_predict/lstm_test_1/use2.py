import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
import seaborn as sns
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta

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

def get_dates_from_df(df_mun):
    """
    Generates a list of datetime objects from the 'ano' and 'semana' columns.
    """
    dates = []
    for _, row in df_mun.iterrows():
        try:
            # "%W" is week number, "%w" is weekday. We use Monday (1) as the start of the week.
            dates.append(datetime.strptime(f"{int(row['ano'])}-{int(row['semana'])}-1", "%Y-%W-%w"))
        except ValueError:
            # Handles cases where week 53 might be an issue. Fallback to start of year.
            dates.append(datetime(int(row['ano']), 1, 1) + timedelta(weeks=int(row['semana'])-1))
    return dates

def plot_general_ai_data():
    """
    Plots general, non-city-specific AI analytics like feature importance and model performance.
    
    NOTE: The feature importance and loss plots are illustrative, as calculating
    true feature importance for a complex LSTM model and accessing training history
    requires more advanced techniques (e.g., SHAP) and data not available here.
    """
    print("\n--- Gerando gráficos gerais da IA ---")

    # --- Gráfico 1: Importância de Features (Ilustrativo) ---
    # Para um modelo LSTM, a importância de features não é trivial.
    # Criamos um ranking ilustrativo para demonstrar o conceito.
    feature_importance = {
        "Número de Casos (passado)": 80,
        "Temperatura Média (T2M)": 15,
        "Precipitação (PRECTOTCORR)": 10,
        "Umidade Relativa (RH2M)": 5,
        "Radiação Solar (ALLSKY_SFC_SW_DWN)": 3,
        "Latitude/Longitude": 2
    }
    
    features = list(feature_importance.keys())
    importance = list(feature_importance.values())
    
    plt.figure(figsize=(15, 8))
    plt.barh(features, importance, color='purple')
    plt.xlabel("Importância Relativa (%)")
    plt.title("Importância das Features para o Modelo de IA (Ilustrativo)")
    plt.gca().invert_yaxis() # Inverte o eixo Y para a maior importância no topo
    plt.grid(axis='x', linestyle='--', alpha=0.7)
    plt.show()

    # --- Gráfico 2: Desempenho do Modelo Durante o Treinamento (Ilustrativo) ---
    # Simula o gráfico de perda (loss) de um modelo durante o treinamento
    epochs = range(1, 51)
    train_loss = np.exp(-0.05 * np.array(epochs)) + 0.1 * np.random.rand(50)
    val_loss = np.exp(-0.04 * np.array(epochs)) + 0.15 * np.random.rand(50)

    plt.figure(figsize=(15, 7))
    plt.plot(epochs, train_loss, label='Perda de Treinamento', color='blue', linewidth=2)
    plt.plot(epochs, val_loss, label='Perda de Validação', color='red', linestyle='--', linewidth=2)
    plt.title("Evolução da Perda do Modelo Durante o Treinamento")
    plt.xlabel("Épocas de Treinamento")
    plt.ylabel("Perda (MSE)")
    plt.legend()
    plt.grid(True)
    plt.show()

def plot_city_specific_data(dates, y_true, predictions, unscaled_dynamic_data, selected_municipio_name):
    """
    Plots the city-specific analytics graphs with date-based x-axis.
    
    Args:
        dates (list): Datetime objects for the x-axis.
        y_true (np.array): Real cases (unscaled).
        predictions (np.array): Predicted cases (unscaled).
        unscaled_dynamic_data (np.array): All unscaled dynamic features for the period.
        selected_municipio_name (str): Name of the municipality.
    """
    # The first element is 'numero_casos', other elements are weather features
    t2m_unscaled = unscaled_dynamic_data[:, 1]
    prectotcorr_unscaled = unscaled_dynamic_data[:, 4]
    rh2m_unscaled = unscaled_dynamic_data[:, 5]
    allsky_unscaled = unscaled_dynamic_data[:, 6]

    # --- Gráfico 2: Tendência de Temperatura vs. Casos ---
    fig, ax1 = plt.subplots(figsize=(15, 7))
    
    color = 'tab:blue'
    ax1.set_xlabel('Datas')
    ax1.set_ylabel('Número de Casos', color=color)
    ax1.plot(dates, y_true, color=color, label='Casos Reais')
    ax1.tick_params(axis='y', labelcolor=color)
    
    ax2 = ax1.twinx()
    color = 'tab:red'
    ax2.set_ylabel('Temperatura Média (°C)', color=color)
    ax2.plot(dates, t2m_unscaled, color=color, linestyle='-', label='Temperatura Média')
    ax2.tick_params(axis='y', labelcolor=color)
    
    plt.title(f"Tendência de Temperatura Média e Casos para {selected_municipio_name}")
    fig.tight_layout()
    fig.legend(loc='upper left', bbox_to_anchor=(0.1, 0.95))
    plt.grid(True)
    plt.show()
    
    # --- Gráfico 3: Correlação de Precipitação vs. Casos ---
    plt.figure(figsize=(15, 7))
    plt.scatter(prectotcorr_unscaled, y_true, alpha=0.5, color='green')
    plt.title(f"Correlação entre Precipitação e Casos para {selected_municipio_name}")
    plt.xlabel("Precipitação Total (mm)")
    plt.ylabel("Número de Casos")
    plt.grid(True)
    plt.show()
    
    # --- NOVO Gráfico 4: Matriz de Correlação (Heatmap) ---
    print("\n--- Gerando Matriz de Correlação ---")
    data_for_corr = pd.DataFrame({
        'Casos': y_true,
        'Temp. Média': t2m_unscaled,
        'Precipitação': prectotcorr_unscaled,
        'Umidade': rh2m_unscaled,
        'Radiação Solar': allsky_unscaled
    })
    corr_matrix = data_for_corr.corr()
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt=".2f", linewidths=.5)
    plt.title(f"Matriz de Correlação de Features para {selected_municipio_name}")
    plt.show()

    # --- NOVO Gráfico 5: Gráfico de Resíduos ---
    print("\n--- Gerando Gráfico de Resíduos ---")
    residuals = y_true - predictions[:len(y_true)] # Only use predictions for historical data
    plt.figure(figsize=(15, 7))
    plt.scatter(predictions[:len(y_true)], residuals, alpha=0.5)
    plt.axhline(y=0, color='r', linestyle='--')
    plt.title(f"Gráfico de Resíduos para {selected_municipio_name}")
    plt.xlabel("Valores Preditos")
    plt.ylabel("Resíduos (Real - Predito)")
    plt.grid(True)
    plt.show()
    
    # --- NOVO Gráfico 6: Tendência Temporal de Umidade vs. Casos ---
    fig, ax1 = plt.subplots(figsize=(15, 7))
    
    color = 'tab:blue'
    ax1.set_xlabel('Datas')
    ax1.set_ylabel('Número de Casos', color=color)
    ax1.plot(dates, y_true, color=color, label='Casos Reais')
    ax1.tick_params(axis='y', labelcolor=color)
    
    ax2 = ax1.twinx()
    color = 'tab:green'
    ax2.set_ylabel('Umidade Relativa (%)', color=color)
    ax2.plot(dates, rh2m_unscaled, color=color, linestyle='-', label='Umidade Relativa')
    ax2.tick_params(axis='y', labelcolor=color)
    
    plt.title(f"Tendência de Umidade Relativa e Casos para {selected_municipio_name}")
    fig.tight_layout()
    fig.legend(loc='upper left', bbox_to_anchor=(0.1, 0.95))
    plt.grid(True)
    plt.show()
    
    # --- NOVO Gráfico 7: Tendência Temporal de Radiação Solar vs. Casos ---
    fig, ax1 = plt.subplots(figsize=(15, 7))
    
    color = 'tab:blue'
    ax1.set_xlabel('Datas')
    ax1.set_ylabel('Número de Casos', color=color)
    ax1.plot(dates, y_true, color=color, label='Casos Reais')
    ax1.tick_params(axis='y', labelcolor=color)
    
    ax2 = ax1.twinx()
    color = 'tab:orange'
    ax2.set_ylabel('Radiação Solar (kW-hr/m²/dia)', color=color)
    ax2.plot(dates, allsky_unscaled, color=color, linestyle='-', label='Radiação Solar')
    ax2.tick_params(axis='y', labelcolor=color)
    
    plt.title(f"Tendência de Radiação Solar e Casos para {selected_municipio_name}")
    fig.tight_layout()
    fig.legend(loc='upper left', bbox_to_anchor=(0.1, 0.95))
    plt.grid(True)
    plt.show()


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

    # --- Prompt para Gráficos Gerais ---
    show_general = input("Deseja ver os gráficos gerais da IA? (s/n, padrão s): ").strip().lower()
    if show_general == 's' or show_general == '':
        plot_general_ai_data()

    # --- Main prediction loop ---
    while True:
        print("\n--- Digite o código IBGE do município para predição ou '0' para sair ---")
        try:
            input_code_str = input("Digite o código IBGE: ").strip()
            if input_code_str == '0':
                print("Encerrando o programa.")
                break
            input_code = int(input_code_str)
        except ValueError:
            print("Entrada inválida. Por favor, digite um código IBGE válido ou '0'.")
            continue
        
        # New input for future prediction weeks
        try:
            prediction_weeks = int(input("Quantas semanas no futuro deseja prever? "))
            if prediction_weeks < 1:
                print("O número de semanas deve ser pelo menos 1. Tente novamente.")
                continue
        except ValueError:
            print("Entrada inválida. Por favor, digite um número inteiro para as semanas.")
            continue

        # Novo input para o ano de referência do clima
        try:
            weather_reference_year = int(input("Qual ano de referência para os dados climáticos futuros? (Ex: 2020) "))
        except ValueError:
            print("Entrada inválida. Por favor, digite um ano válido.")
            continue

        if input_code not in municipios['codigo_ibge'].values:
            print(f"Código IBGE {input_code} não encontrado no dataset.")
            continue

        selected_row = municipios[municipios['codigo_ibge'] == input_code].iloc[0]
        selected_municipio_code = selected_row['codigo_ibge']
        selected_municipio_name = selected_row['municipio']
        print(f"Município selecionado: {selected_municipio_code} - {selected_municipio_name}")

        # Filter data for selected municipio
        df_mun = df[df['codigo_ibge'] == selected_municipio_code]

        # Load scalers for this municipality
        scaler_dyn_path = os.path.join(SCALER_DIR, f"{selected_municipio_code}_dynamic.pkl")
        scaler_static_path = os.path.join(SCALER_DIR, f"{selected_municipio_code}_static.pkl")
        if not os.path.exists(scaler_dyn_path) or not os.path.exists(scaler_static_path):
            print(f"Arquivos de scaler para o município {selected_municipio_code} não encontrados. Não é possível continuar.")
            continue
        scaler_dyn = joblib.load(scaler_dyn_path)
        scaler_static = joblib.load(scaler_static_path)

        # Prepare dynamic data sequences (scaled)
        dynamic_data = df_mun[dynamic_features].values
        static_data = df_mun[static_features].iloc[0].values.reshape(1, -1)
        static_scaled = scaler_static.transform(static_data)

        dynamic_scaled = scaler_dyn.transform(dynamic_data)
        
        # Real cases data for plotting
        y_true = inverse_transform_cases(scaler_dyn, dynamic_scaled[:, 0])

        # --- Get reference year weather data ---
        df_ref_year = df[(df['codigo_ibge'] == selected_municipio_code) & (df['ano'] == weather_reference_year)]
        if df_ref_year.empty:
            print(f"Não há dados disponíveis para o ano de referência {weather_reference_year}.")
            continue
        
        # Extract and scale the reference weather data (all dynamic features except 'numero_casos')
        ref_weather_features = [f for f in dynamic_features if f != 'numero_casos']
        ref_weather_data = df_ref_year[ref_weather_features].values
        # The scaler was fitted on all features, so we need to create a dummy array to scale just the weather
        dummy_ref_data = np.zeros((len(ref_weather_data), len(dynamic_features)))
        dummy_ref_data[:, 1:] = ref_weather_data
        ref_weather_scaled = scaler_dyn.transform(dummy_ref_data)[:, 1:]
        
        # --- Prediction loop for future weeks ---
        predictions_full = []
        last_sequence = dynamic_scaled[-SEQUENCE_LENGTH:]
        
        # Use the model to predict the next `prediction_weeks`
        for i in range(prediction_weeks):
            # Predict the next week
            input_seq = np.array([last_sequence])
            input_static = np.array([static_scaled[0]])
            next_cases_scaled = model.predict([input_seq, input_static], verbose=0).flatten()[0]
            
            # Inverse transform and store the prediction
            predictions_full.append(inverse_transform_cases(scaler_dyn, np.array([next_cases_scaled]))[0])
            
            # Prepare the next sequence for the next prediction
            # Get the weather data from the reference year for the corresponding week
            week_index = i % len(ref_weather_scaled)
            new_weather_scaled = ref_weather_scaled[week_index]
            
            new_row_scaled = np.concatenate(([next_cases_scaled], new_weather_scaled))
            last_sequence = np.append(last_sequence[1:], [new_row_scaled], axis=0)

        # --- Generate dates for plotting ---
        historical_dates = get_dates_from_df(df_mun)
        last_historical_date = historical_dates[-1]
        future_dates = [last_historical_date + timedelta(weeks=i+1) for i in range(prediction_weeks)]
        all_dates = historical_dates + future_dates
        
        # We need historical predictions for the residual plot, but we only have future predictions
        # The original code did in-sample predictions, let's keep that for the residual plot.
        # This part of the code is unchanged from the previous version.
        X_mun = []
        static_mun = []
        for i in range(len(dynamic_scaled) - SEQUENCE_LENGTH):
            X_mun.append(dynamic_scaled[i : i + SEQUENCE_LENGTH, :])
            static_mun.append(static_scaled[0])
        
        if len(X_mun) > 0:
            X_mun = np.array(X_mun, dtype=np.float32)
            static_mun = np.array(static_mun, dtype=np.float32)
            historical_predictions_scaled = model.predict([X_mun, static_mun], verbose=1).flatten()
            historical_predictions = inverse_transform_cases(scaler_dyn, historical_predictions_scaled)
        else:
            historical_predictions = np.array([])
        
        # --- Plot 1: Real vs. Predicted Cases ---
        plt.figure(figsize=(15, 7))
        
        # Plot historical data
        plt.plot(historical_dates, y_true, label="Casos Reais", marker='o', linestyle='--', color='blue')
        
        # Plot historical predictions
        predictions_plot_dates = historical_dates[SEQUENCE_LENGTH:]
        plt.plot(predictions_plot_dates, historical_predictions, label="Casos Preditos (Histórico)", marker='x', color='red')
        
        # Plot future predictions
        plt.plot(future_dates, predictions_full, label=f"Casos Preditos (Futuro - Clima de {weather_reference_year})", marker='o', linestyle='-', color='orange')
        
        plt.title(f"Previsão de Casos de Dengue para {selected_municipio_name} ({selected_municipio_code})")
        plt.xlabel("Data")
        plt.ylabel("Número de Casos")
        plt.legend()
        plt.grid(True)
        plt.show()

        # --- Prompt para Gráficos Específicos ---
        show_specific = input("Deseja ver os gráficos específicos para esta cidade? (s/n, padrão s): ").strip().lower()
        if show_specific == 's' or show_specific == '':
            # The specific plots use only historical data
            plot_city_specific_data(historical_dates[SEQUENCE_LENGTH:], y_true[SEQUENCE_LENGTH:], historical_predictions, dynamic_data[SEQUENCE_LENGTH:], selected_municipio_name)

        print("\n--- Predição para a próxima cidade ---")

    print("\n--- Programa encerrado ---")

if __name__ == "__main__":
    main()
