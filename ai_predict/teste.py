import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# Configurações
VOLATILIDADE_BASE = 3
NUMERO_De_DSEMANAS = 15

estados = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"]
ESTADO = estados[7]  # Exemplo de estado para plotar

# Leitura dos dados
df = pd.read_csv('dengues.csv', sep=',')

# Transformar colunas de datas para datetime e dados para formato longo
df_long = df.melt(id_vars='estado', var_name='periodo', value_name='casos')
df_long['periodo'] = pd.to_datetime(df_long['periodo'] + '0', format='%Y/%W%w')

# Filtra só o estado escolhido
df_estado = df_long[df_long['estado'] == ESTADO].sort_values('periodo').reset_index(drop=True)

# Calcula volatilidade local (desvio padrão móvel)
def calcular_volatilidade(casos, janela=4):
    return casos.rolling(window=janela, min_periods=1).std().fillna(0)

df_estado['volatilidade_real'] = calcular_volatilidade(df_estado['casos'])

# Suaviza com alpha adaptado pela volatilidade real
def suavizar_linha_adaptativa(casos, volatilidade_real):
    vol_norm = np.clip(volatilidade_real / volatilidade_real.max(), 0, 1)
    alpha_adaptativo = vol_norm * 0.9 + 0.1
    alpha_medio = alpha_adaptativo.mean()
    return casos.ewm(alpha=alpha_medio).mean()

df_estado['casos_suavizados'] = suavizar_linha_adaptativa(df_estado['casos'], df_estado['volatilidade_real'])

# Previsão com ajuste pela volatilidade real (peso na previsão)
def prever_proximas_semanas_adaptativa(df_estado, num_semanas):
    previsoes = []
    base = df_estado.copy()
    last_date = base['periodo'].max()

    for i in range(1, num_semanas + 1):
        data_prev = last_date + pd.DateOffset(weeks=i)

        vol_media = base['volatilidade_real'].tail(4).mean()
        ajuste_vol = 1 + (vol_media / base['volatilidade_real'].max()) * 0.5  # até +50% ajuste

        periodo_ano_anterior = data_prev - pd.DateOffset(years=1)
        janela_inicio = periodo_ano_anterior - pd.DateOffset(weeks=2)
        janela_fim = periodo_ano_anterior + pd.DateOffset(weeks=2)

        trecho_ano_anterior = base[(base['periodo'] >= janela_inicio) & (base['periodo'] <= janela_fim)]

        if trecho_ano_anterior.empty:
            pred = base['casos_suavizados'].iloc[-1]
        else:
            intens = base[base['periodo'] < data_prev]['casos_suavizados'].iloc[-1]
            comportamento = trecho_ano_anterior['casos'].mean()
            pred = intens * (comportamento / trecho_ano_anterior['casos_suavizados'].mean()) * ajuste_vol

        previsoes.append({'periodo': data_prev, 'casos': pred})

        base = pd.concat([base, pd.DataFrame({'periodo':[data_prev], 'casos':[pred], 'estado':[ESTADO]})], ignore_index=True)
        base['volatilidade_real'] = calcular_volatilidade(base['casos'])
        base['casos_suavizados'] = suavizar_linha_adaptativa(base['casos'], base['volatilidade_real'])

    return pd.DataFrame(previsoes)

df_prev = prever_proximas_semanas_adaptativa(df_estado, NUMERO_De_DSEMANAS)

# Plot
plt.figure(figsize=(17,6))
plt.plot(df_estado['periodo'], df_estado['casos'], label='Dados Reais', marker='o')
plt.plot(df_estado['periodo'], df_estado['casos_suavizados'], label='Linha Suavizada', linestyle='--')
plt.plot(df_prev['periodo'], df_prev['casos'], label='Previsão com Volatilidade', marker='x', linestyle='-.')
plt.title(f'Casos de Dengue - {ESTADO} com Volatilidade na Previsão')
plt.xlabel('Período')
plt.ylabel('Casos')
plt.legend()
plt.grid(True)
plt.show()
