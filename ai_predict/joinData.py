import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import mean_squared_error
import matplotlib.pyplot as plt
import tkinter as tk
from tkinter import ttk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

# Load once
dengue = pd.read_csv('ai_predict/dengue.csv')
climate = pd.read_csv('ai_predict/dados_nasa_semanal.csv').rename(columns={'state': 'estado'})

# Prepare dengue_long (melt dengue cases by state and week/year)
dengue_long = dengue.melt(id_vars='estado', var_name='year_week', value_name='cases')
dengue_long[['year', 'week']] = dengue_long['year_week'].str.split('/', expand=True).astype(int)
dengue_long.drop(columns='year_week', inplace=True)

# Merge dengue and climate data
data_all = pd.merge(dengue_long, climate, on=['estado', 'year', 'week'], how='left').sort_values(['estado','year','week'])
estados = sorted(data_all['estado'].unique())

def create_lags_and_features(df):
    df = df.sort_values(['estado', 'year', 'week']).copy()

    # Create case lags (1 to 6 weeks)
    for lag in range(1, 7):
        df[f'cases_lag_{lag}'] = df.groupby('estado')['cases'].shift(lag)

    # Create lags for climate features with different windows
    for lag in range(4, 10):
        for col in ['T2M', 'T2M_MAX', 'RH2M']:
            df[f'{col}_lag_{lag}'] = df.groupby('estado')[col].shift(lag)
    for lag in range(6, 14):
        for col in ['PRECTOTCORR', 'ALLSKY_SFC_SW_DWN']:
            df[f'{col}_lag_{lag}'] = df.groupby('estado')[col].shift(lag)

    # Rolling means (4 and 8 week windows) for cases and climate vars
    for window in [4, 8]:
        df[f'cases_rollmean_{window}'] = df.groupby('estado')['cases'].transform(lambda x: x.rolling(window).mean())
        for col in ['T2M', 'T2M_MAX', 'RH2M', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN']:
            df[f'{col}_rollmean_{window}'] = df.groupby('estado')[col].transform(lambda x: x.rolling(window).mean())

    # Add temporal features: month and quarter derived from week number
    df['month'] = ((df['week'] - 1) // 4) + 1
    df['quarter'] = ((df['month'] - 1) // 3) + 1

    return df.dropna()

def next_week(year, week):
    week += 1
    if week > 52:
        week = 1
        year += 1
    return year, week

def train_and_plot(estado, test_pct):
    # Data with lags and features (dropna)
    data = create_lags_and_features(data_all[data_all['estado'] == estado].copy())
    data = data.sort_values(['year', 'week']).reset_index(drop=True)

    # Original data without dropping rows, for plotting all cases
    original_data = data_all[data_all['estado'] == estado].sort_values(['year', 'week']).reset_index(drop=True)

    features = [c for c in data.columns if c not in ['estado','year','week','cases']]

    split_index = int(len(data) * (1 - test_pct / 100))
    X_train = data.iloc[:split_index][features]
    y_train = data.iloc[:split_index]['cases']
    X_test = data.iloc[split_index:][features]
    y_test = data.iloc[split_index:]['cases']

    train_data = lgb.Dataset(X_train, label=y_train)
    valid_data = lgb.Dataset(X_test, label=y_test)

    # More complex parameters for better precision (may increase training time)
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'boosting_type': 'gbdt',
        'learning_rate': 0.01,
        'num_leaves': 64,
        'max_depth': 10,
        'min_child_samples': 20,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'lambda_l1': 0.5,
        'lambda_l2': 1.0,
        'verbose': -1,
        'seed': 42
    }

    model = lgb.train(
        params, train_data, num_boost_round=3000,
        valid_sets=[train_data, valid_data],
        callbacks=[lgb.early_stopping(100), lgb.log_evaluation(period=100)]
    )

    y_pred = model.predict(X_test, num_iteration=model.best_iteration)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    fig, axs = plt.subplots(1, 2, figsize=(14, 5))

    # Scatter plot as before
    axs[0].scatter(y_test, y_pred, alpha=0.6, edgecolors='k')
    axs[0].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
    axs[0].set(xlabel='Actual Cases', ylabel='Predicted Cases', title=f'Actual vs Predicted (RMSE: {rmse:.2f})')
    axs[0].grid(True)

    # Time series plot — now usando original_data para a linha completa
    x_full = np.arange(len(original_data))
    x_test = np.arange(split_index, len(data)) + (len(original_data) - len(data))  # Ajusta índice para o teste

    axs[1].plot(x_full, original_data['cases'], label='All Cases', linestyle='--', color='gray')
    axs[1].plot(x_test, y_test.values, label='Actual (Test)', marker='o')
    axs[1].plot(x_test, y_pred, label='Predicted', marker='x')
    axs[1].tick_params(axis='x', rotation=45)
    axs[1].legend()
    axs[1].grid(True)

    plt.tight_layout()
    return fig, rmse

class DengueApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Dengue Cases Prediction")
        self.geometry("900x700")

        ttk.Label(self, text="Select State:").pack(pady=5)
        self.estado_var = tk.StringVar(value=estados[0])
        ttk.Combobox(self, values=estados, textvariable=self.estado_var, state='readonly').pack(pady=5)

        ttk.Label(self, text="Test Set Percentage (%):").pack(pady=5)
        self.test_pct_var = tk.IntVar(value=20)
        ttk.Spinbox(self, from_=5, to=50, increment=5, textvariable=self.test_pct_var).pack(pady=5)

        ttk.Button(self, text="Train & Plot", command=self.train_and_show).pack(pady=10)

        self.rmse_label = ttk.Label(self, text="")
        self.rmse_label.pack()
        self.canvas = None

    def train_and_show(self):
        estado = self.estado_var.get()
        test_pct = self.test_pct_var.get()
        fig, rmse = train_and_plot(estado, test_pct)
        self.rmse_label.config(text=f"RMSE: {rmse:.2f}")
        if self.canvas:
            self.canvas.get_tk_widget().destroy()
        self.canvas = FigureCanvasTkAgg(fig, master=self)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

if __name__ == "__main__":
    DengueApp().mainloop()
