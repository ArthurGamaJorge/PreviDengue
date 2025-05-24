import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import matplotlib.pyplot as plt
import tkinter as tk
from tkinter import ttk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

# Load data once
dengue = pd.read_csv('ai_predict/dengue.csv')
climate = pd.read_csv('ai_predict/dados_nasa_semanal.csv')
climate = climate.rename(columns={'state': 'estado'})

# Prepare dengue_long
dengue_long = dengue.melt(id_vars='estado', var_name='year_week', value_name='cases')
dengue_long[['year', 'week']] = dengue_long['year_week'].str.split('/', expand=True)
dengue_long['year'] = dengue_long['year'].astype(int)
dengue_long['week'] = dengue_long['week'].astype(int)
dengue_long = dengue_long.drop(columns=['year_week'])

# Merge
data_all = pd.merge(dengue_long, climate, how='left', on=['estado', 'year', 'week'])
data_all = data_all.sort_values(['estado', 'year', 'week'])

estados = sorted(data_all['estado'].unique())

def train_and_plot(estado, test_size):

    # Filtra estado
    data = data_all[data_all['estado'] == estado].copy()

    # Criar lags
    for lag in range(1, 4):
        data[f'cases_lag_{lag}'] = data['cases'].shift(lag)
    for lag in range(2, 5):
        data[f'T2M_lag_{lag}'] = data['T2M'].shift(lag)
        data[f'RH2M_lag_{lag}'] = data['RH2M'].shift(lag)
    for lag in range(3, 6):
        data[f'PRECTOTCORR_lag_{lag}'] = data['PRECTOTCORR'].shift(lag)
    data = data.dropna()

    features = [c for c in data.columns if c not in ['estado', 'year', 'week', 'cases']]

    X = data[features]
    y = data['cases']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

    train_data = lgb.Dataset(X_train, label=y_train)
    valid_data = lgb.Dataset(X_test, label=y_test)

    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'boosting_type': 'gbdt',
        'learning_rate': 0.05,
        'num_leaves': 31,
        'verbose': -1,
        'seed': 42
    }

    model = lgb.train(
        params,
        train_data,
        num_boost_round=1000,
        valid_sets=[train_data, valid_data],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50),
            lgb.log_evaluation(period=50)  # ou mude para 0 para não mostrar logs
        ]
    )


    y_pred = model.predict(X_test, num_iteration=model.best_iteration)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    # --- Parte NOVA: previsão para 5 semanas à frente ---

    n_future = 5  # número de semanas futuras para prever

    # Pegando os últimos dados ordenados para o estado
    data = data_all[data_all['estado'] == estado].copy()
    for lag in range(1, 4):
        data[f'cases_lag_{lag}'] = data['cases'].shift(lag)
    for lag in range(2, 5):
        data[f'T2M_lag_{lag}'] = data['T2M'].shift(lag)
        data[f'RH2M_lag_{lag}'] = data['RH2M'].shift(lag)
    for lag in range(3, 6):
        data[f'PRECTOTCORR_lag_{lag}'] = data['PRECTOTCORR'].shift(lag)
    data = data.dropna()
    data = data.sort_values(['year', 'week']).reset_index(drop=True)

    features = [c for c in data.columns if c not in ['estado', 'year', 'week', 'cases']]

    last_known = data.iloc[-1].copy()

    future_predictions = []
    last_year = last_known['year']
    last_week = last_known['week']

    # Função para avançar semana (com troca de ano)
    def next_week(year, week):
        week += 1
        if week > 52:
            week = 1
            year += 1
        return year, week

    for i in range(n_future):
        # Criar nova linha de features para a próxima semana
        year_fut, week_fut = next_week(last_year, last_week)

        new_row = {'estado': estado, 'year': year_fut, 'week': week_fut}

        # Atualizar os lags (shift lag features) baseados nas últimas predições + dados climáticos da semana futura
        # Para dados climáticos, vamos tentar pegar do dataset original se existir para o ano/semana futura, senão NaN (pode melhorar usando forecast climático externo)
        clim_data = climate[(climate['estado'] == estado) & (climate['year'] == year_fut) & (climate['week'] == week_fut)]

        if clim_data.empty:
            clim_data = climate[(climate['estado'] == estado) & (climate['year'] == last_year) & (climate['week'] == last_week)]

        if clim_data.empty:
            # fallback final: usar valores do último registro do data_all processado
            for col in ['T2M', 'RH2M', 'PRECTOTCORR']:
                new_row[col] = last_known[col]
        else:
            for col in ['T2M', 'RH2M', 'PRECTOTCORR']:
                new_row[col] = clim_data.iloc[0][col]


        # Atualizar lag features:

        # Para casos_lag_1,2,3: usar previsões anteriores ou últimos valores conhecidos
        for lag in range(1, 4):
            if lag == 1:
                # lag1 = última previsão ou último valor real
                if i == 0:
                    new_row[f'cases_lag_{lag}'] = last_known['cases']
                else:
                    new_row[f'cases_lag_{lag}'] = future_predictions[-1]
            else:
                # lag 2 ou 3: pegar da "nova linha" do passo anterior, ou últimos valores conhecidos
                if i - lag + 1 >= 0:
                    new_row[f'cases_lag_{lag}'] = future_predictions[i - lag + 1]
                else:
                    new_row[f'cases_lag_{lag}'] = data.iloc[-lag]['cases']

        # Para T2M_lag_2..4, RH2M_lag_2..4, PRECTOTCORR_lag_3..5: usar dados climáticos passados, vamos simplificar usando os últimos valores conhecidos
        for lag in range(2, 5):
            new_row[f'T2M_lag_{lag}'] = data.iloc[-lag][f'T2M']
            new_row[f'RH2M_lag_{lag}'] = data.iloc[-lag][f'RH2M']
        for lag in range(3, 6):
            new_row[f'PRECTOTCORR_lag_{lag}'] = data.iloc[-lag][f'PRECTOTCORR']

        # Montar DataFrame para predição
        df_pred = pd.DataFrame([new_row])
        df_pred = df_pred[features]

        pred = model.predict(df_pred, num_iteration=model.best_iteration)[0]

        future_predictions.append(pred)
        last_year, last_week = year_fut, week_fut

    # --- Fim previsão futura ---

    # Gráfico combinado: teste + futuro

    fig, axs = plt.subplots(1, 3, figsize=(21, 5))

    # Scatter atual vs previsto
    axs[0].scatter(y_test, y_pred, alpha=0.6, edgecolors='k')
    axs[0].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
    axs[0].set_xlabel('Actual Cases')
    axs[0].set_ylabel('Predicted Cases')
    axs[0].set_title(f'Actual vs Predicted Cases (RMSE: {rmse:.2f})')
    axs[0].grid(True)

    # Linha primeiros 50 pontos teste
    axs[1].plot(y_test.values[:50], label='Actual Cases', marker='o')
    axs[1].plot(y_pred[:50], label='Predicted Cases', marker='x')
    axs[1].set_xlabel('Sample Index (First 50 Test Samples)')
    axs[1].set_ylabel('Number of Cases')
    axs[1].set_title('Predicted vs Actual Cases (First 50 Samples)')
    axs[1].legend()
    axs[1].grid(True)

    # Linha previsão futura 5 semanas
    axs[2].plot(range(1, n_future + 1), future_predictions, label='Predicted Future Cases', marker='^', color='orange')
    axs[2].set_xlabel('Weeks Ahead')
    axs[2].set_ylabel('Number of Cases')
    axs[2].set_title(f'Forecast for Next {n_future} Weeks')
    axs[2].legend()
    axs[2].grid(True)

    plt.tight_layout()
    return fig, rmse


# Construindo a GUI
class DengueApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Dengue Cases Prediction")
        self.geometry("900x650")

        # Estado dropdown
        ttk.Label(self, text="Select State:").pack(pady=5)
        self.estado_var = tk.StringVar(value=estados[0])
        estado_combo = ttk.Combobox(self, values=estados, textvariable=self.estado_var, state='readonly')
        estado_combo.pack(pady=5)

        # Test size spinbox
        ttk.Label(self, text="Test Size (fraction):").pack(pady=5)
        self.test_size_var = tk.DoubleVar(value=0.2)
        test_spin = ttk.Spinbox(self, from_=0.05, to=0.5, increment=0.05, textvariable=self.test_size_var)
        test_spin.pack(pady=5)

        # Button to train and plot
        btn = ttk.Button(self, text="Train & Plot", command=self.train_and_show)
        btn.pack(pady=10)

        # Label for RMSE
        self.rmse_label = ttk.Label(self, text="")
        self.rmse_label.pack()

        # Placeholder for matplotlib canvas
        self.canvas = None

    def train_and_show(self):
        estado = self.estado_var.get()
        test_size = self.test_size_var.get()

        fig, rmse = train_and_plot(estado, test_size)

        self.rmse_label.config(text=f"RMSE: {rmse:.2f}")

        # Remove old canvas
        if self.canvas:
            self.canvas.get_tk_widget().destroy()

        self.canvas = FigureCanvasTkAgg(fig, master=self)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

# Rodar app
if __name__ == "__main__":
    app = DengueApp()
    app.mainloop()
