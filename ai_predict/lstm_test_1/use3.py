import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
import seaborn as sns
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
from sklearn.metrics import r2_score, mean_absolute_error
import base64
from io import BytesIO

# --- Configurações de Caminhos ---
# Certifique-se de que estes caminhos apontam para os arquivos corretos.
DATA_PATH = "../data/final_training_data.parquet"
MODEL_PATH = "./checkpoints/model_checkpoint_best.keras"
SCALER_DIR = "./scalers/"
SEQUENCE_LENGTH = 12

# Dicionário para traduzir e embelezar nomes de features
FEATURE_NAMES_PT = {
    "numero_casos": "Nº de Casos de Dengue",
    "T2M": "Temperatura Média (°C)",
    "T2M_MAX": "Temperatura Máxima (°C)",
    "T2M_MIN": "Temperatura Mínima (°C)",
    "PRECTOTCORR": "Precipitação (mm)",
    "RH2M": "Umidade Relativa (%)",
    "ALLSKY_SFC_SW_DWN": "Radiação Solar (W/m²)"
}

def plot_to_base64():
    """Converte um plot do matplotlib para uma string base64 para embutir em HTML."""
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    return img_str

def inverse_transform_cases(scaler, data, feature_index=0):
    """Função auxiliar para desfazer a normalização do número de casos."""
    # Garante que a entrada seja um array 2D
    if data.ndim == 1:
        data = data.reshape(-1, 1)
    
    dummy_data = np.zeros((len(data), scaler.n_features_in_))
    dummy_data[:, feature_index] = data.flatten()
    return scaler.inverse_transform(dummy_data)[:, feature_index]

def get_dates_from_df(df_mun):
    """Gera uma lista de objetos datetime a partir das colunas 'ano' e 'semana'."""
    dates = []
    for _, row in df_mun.iterrows():
        try:
            dates.append(datetime.strptime(f"{int(row['ano'])}-{int(row['semana'])}-1", "%Y-%W-%w"))
        except ValueError:
            # Lida com casos onde a semana 53 pode ser um problema
            dates.append(datetime(int(row['ano']), 1, 1) + timedelta(weeks=int(row['semana'])-1))
    return dates

def analyze_model_performance(dates, y_true, historical_predictions):
    """Gera análises e gráficos sobre a performance do modelo."""
    insights = {}
    y_true_trimmed = y_true[SEQUENCE_LENGTH:]
    prediction_dates = dates[SEQUENCE_LENGTH:]

    # --- Gráfico 1: Real vs. Predito ---
    plt.figure(figsize=(12, 6))
    plt.plot(dates, y_true, label="Casos Reais", linestyle='-', color='royalblue', alpha=0.8, linewidth=2)
    if historical_predictions.size > 0:
        plt.plot(prediction_dates, historical_predictions, label="Previsões da IA (Histórico)", linestyle='--', color='tomato', alpha=0.9, linewidth=2)
    plt.title("Análise Histórica: Casos Reais vs. Previsões da IA", fontsize=16)
    plt.xlabel("Data", fontsize=12)
    plt.ylabel("Número de Casos Semanais", fontsize=12)
    plt.legend()
    plt.grid(True, which='both', linestyle='--', linewidth=0.5)
    plt.tight_layout()
    insights['plot_real_vs_predito'] = plot_to_base64()

    # --- Métricas de Performance ---
    mae = mean_absolute_error(y_true_trimmed, historical_predictions)
    r2 = r2_score(y_true_trimmed, historical_predictions)
    insights['mae'] = f"{mae:.2f}"
    insights['r2'] = f"{r2:.2f}"
    insights['r2_percent'] = f"{r2*100:.1f}%"

    # --- Gráfico 2: Análise de Erros (Resíduos) ---
    errors = y_true_trimmed - historical_predictions
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Histograma dos Erros
    sns.histplot(errors, kde=True, ax=ax1, color='teal')
    ax1.set_title("Distribuição dos Erros de Previsão", fontsize=14)
    ax1.set_xlabel("Erro (Real - Predito)", fontsize=12)
    ax1.set_ylabel("Frequência", fontsize=12)
    ax1.axvline(x=0, color='red', linestyle='--')

    # Scatter Plot dos Erros
    ax2.scatter(y_true_trimmed, historical_predictions, alpha=0.6, c=errors, cmap='coolwarm_r')
    ax2.plot([y_true_trimmed.min(), y_true_trimmed.max()], [y_true_trimmed.min(), y_true_trimmed.max()], 'r--', lw=2)
    ax2.set_title("Previsões vs. Valores Reais", fontsize=14)
    ax2.set_xlabel("Casos Reais", fontsize=12)
    ax2.set_ylabel("Casos Preditos pela IA", fontsize=12)

    plt.tight_layout()
    insights['plot_error_analysis'] = plot_to_base64()

    return insights

def analyze_dengue_drivers(df_for_corr):
    """Analisa os gatilhos climáticos da dengue."""
    insights = {}
    
    # --- Gráfico 3: Matriz de Correlação ---
    corr_matrix = df_for_corr.corr()
    plt.figure(figsize=(10, 8))
    sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt='.2f', linewidths=.5)
    plt.title("Matriz de Correlação entre Variáveis", fontsize=16)
    insights['plot_correlation_heatmap'] = plot_to_base64()
    insights['correlations'] = corr_matrix['Nº de Casos de Dengue'].drop('Nº de Casos de Dengue').sort_values(ascending=False)

    # --- Gráfico 4: Análise de Defasagem (Lag) ---
    max_lag = 12 # Analisar até 12 semanas de defasagem
    lag_correlations = {}
    
    cases_series = df_for_corr['Nº de Casos de Dengue']
    
    for col in df_for_corr.columns:
        if col != 'Nº de Casos de Dengue':
            lags = range(1, max_lag + 1)
            corrs = [cases_series.corr(df_for_corr[col].shift(lag)) for lag in lags]
            lag_correlations[col] = corrs
            
    plt.figure(figsize=(12, 7))
    for feature_name, corrs in lag_correlations.items():
        plt.plot(range(1, max_lag + 1), corrs, marker='o', linestyle='-', label=feature_name)
    
    plt.title('Análise de Defasagem (Lag): Impacto Climático ao Longo do Tempo', fontsize=16)
    plt.xlabel('Defasagem (Semanas)', fontsize=12)
    plt.ylabel('Correlação com Casos de Dengue', fontsize=12)
    plt.axhline(0, color='black', linestyle='--', linewidth=0.7)
    plt.xticks(range(1, max_lag + 1))
    plt.grid(True, which='both', linestyle='--', linewidth=0.5)
    plt.legend()
    plt.tight_layout()
    insights['plot_lag_analysis'] = plot_to_base64()

    # Encontrar os picos de lag para texto
    lag_peaks = {}
    for feature, corrs in lag_correlations.items():
        peak_lag = np.argmax(np.abs(corrs)) + 1
        peak_corr = corrs[peak_lag - 1]
        lag_peaks[feature] = (peak_lag, peak_corr)
    insights['lag_peaks'] = lag_peaks

    return insights

def analyze_seasonality(df_mun, df_for_corr):
    """Analisa o perfil sazonal da dengue e do clima."""
    insights = {}
    df_seasonal = df_for_corr.copy()
    df_seasonal['Semana do Ano'] = df_mun['semana'].astype(int)
    
    # Calcular médias por semana do ano
    weekly_avg = df_seasonal.groupby('Semana do Ano').mean()

    # --- Gráfico 5: Perfil Sazonal ---
    fig, ax1 = plt.subplots(figsize=(14, 7))
    
    # Eixo esquerdo para casos
    color = 'tab:red'
    ax1.set_xlabel('Semana Epidemiológica do Ano', fontsize=12)
    ax1.set_ylabel('Média Histórica de Casos', color=color, fontsize=12)
    ax1.plot(weekly_avg.index, weekly_avg['Nº de Casos de Dengue'], color=color, linewidth=2.5, label='Média de Casos')
    ax1.tick_params(axis='y', labelcolor=color)
    ax1.grid(True, axis='y', linestyle='--', linewidth=0.5)
    
    # Eixo direito para clima
    ax2 = ax1.twinx()
    color_temp = 'tab:orange'
    color_prec = 'tab:blue'
    ax2.set_ylabel('Clima (Temperatura e Precipitação)', fontsize=12)
    ax2.plot(weekly_avg.index, weekly_avg['Temperatura Média (°C)'], color=color_temp, linestyle='--', label='Temp. Média (°C)')
    ax2.plot(weekly_avg.index, weekly_avg['Precipitação (mm)'], color=color_prec, linestyle=':', label='Precipitação (mm)')
    ax2.tick_params(axis='y')

    fig.suptitle('Perfil Sazonal da Dengue: O "Ano Típico" no Município', fontsize=16)
    fig.legend(loc="upper right", bbox_to_anchor=(1,1), bbox_transform=ax1.transAxes)
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    
    insights['plot_seasonality'] = plot_to_base64()
    return insights

def generate_html_report(municipio_name, municipio_code, insights):
    """Gera o relatório completo em formato HTML."""
    
    # Extrair insights para facilitar o uso no template
    perf = insights['performance']
    drivers = insights['drivers']
    season = insights['seasonality']
    
    # Construir texto de análise dos drivers
    drivers_text = ""
    for feature, corr in drivers['correlations'].items():
        relation = "positiva" if corr > 0 else "negativa"
        strength = "forte" if abs(corr) > 0.5 else "moderada" if abs(corr) > 0.2 else "fraca"
        drivers_text += f"<li><strong>{feature}:</strong> Correlação {relation} e {strength} (<code>{corr:.2f}</code>).</li>"
        
    lag_text = ""
    for feature, (lag, corr) in drivers['lag_peaks'].items():
        lag_text += f"<li><strong>{feature}:</strong> O maior impacto nos casos de dengue ocorre com uma defasagem de <strong>{lag} semanas</strong> (correlação de <code>{corr:.2f}</code>).</li>"

    html_template = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Análise da IA - Dengue em {municipio_name}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 20px; }}
            .container {{ max-width: 1000px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }}
            h1, h2, h3 {{ color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 10px; margin-top: 40px; }}
            h1 {{ font-size: 2.5em; text-align: center; }}
            h2 {{ font-size: 1.8em; }}
            h3 {{ font-size: 1.4em; border-bottom: 1px solid #dee2e6; }}
            p, li {{ font-size: 1.1em; color: #555; }}
            .metric-box {{ display: flex; justify-content: space-around; text-align: center; margin: 30px 0; }}
            .metric {{ background-color: #e9f5ff; padding: 20px; border-radius: 8px; width: 45%; }}
            .metric h3 {{ margin: 0; color: #004085; border: none; }}
            .metric p {{ font-size: 2em; font-weight: bold; color: #004085; margin: 10px 0 0 0; }}
            .insight-box {{ background-color: #fffbe6; border-left: 5px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; }}
            img {{ max-width: 100%; height: auto; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }}
            code {{ background-color: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: "Courier New", Courier, monospace; }}
            .summary {{ background-color: #e6f7ff; border: 1px solid #91d5ff; padding: 20px; border-radius: 8px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Relatório de Inteligência Artificial<br>Análise da Dengue em {municipio_name}</h1>
            <p style="text-align:center; font-style:italic;">Relatório gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')} para o município de código IBGE {municipio_code}</p>

            <div class="summary">
                <h2>Sumário Executivo para o Gestor de Saúde</h2>
                <p>Este relatório detalha como o modelo de Inteligência Artificial (IA) entende a dinâmica da dengue em <strong>{municipio_name}</strong>. A análise revela os principais gatilhos climáticos, a confiabilidade das previsões e os padrões sazonais, transformando dados em inteligência acionável.</p>
                <h3>Principais Conclusões:</h3>
                <ul>
                    <li><strong>Confiabilidade do Modelo:</strong> A IA consegue explicar <strong>{perf['r2_percent']}</strong> da variação dos casos históricos, com um erro médio de <strong>{perf['mae']} casos</strong> por semana. Isso indica uma alta confiabilidade para prever tendências e sazonalidade.</li>
                    <li><strong>Gatilhos Chave:</strong> Os fatores climáticos mais influentes são <strong>{drivers['correlations'].index[0]}</strong> e <strong>{drivers['correlations'].index[1]}</strong>.</li>
                    <li><strong>Alerta Antecipado (Timing):</strong> O impacto das chuvas e do calor não é imediato. A análise de defasagem mostra que o maior aumento nos casos ocorre em média <strong>{drivers['lag_peaks']['Precipitação (mm)'][0]} semanas após picos de chuva</strong> e <strong>{drivers['lag_peaks']['Temperatura Média (°C)'][0]} semanas após o aumento da temperatura</strong>. Esta é a janela crítica para intensificar ações preventivas.</li>
                </ul>
            </div>

            <h2>1. Desempenho e Confiabilidade do Modelo de IA</h2>
            <p>O primeiro passo é entender se podemos confiar no modelo. Avaliamos o quão bem as previsões da IA se alinham com os dados reais do passado.</p>
            
            <h3>Métricas Chave de Desempenho</h3>
            <div class="metric-box">
                <div class="metric">
                    <h3>Coeficiente de Determinação (R²)</h3>
                    <p>{perf['r2']}</p>
                    <span>Mede o quanto o modelo consegue "explicar" os dados. Um valor de 1.0 seria um ajuste perfeito. O modelo explica <strong>{perf['r2_percent']}</strong> da dinâmica da dengue no município.</span>
                </div>
                <div class="metric">
                    <h3>Erro Absoluto Médio (MAE)</h3>
                    <p>{perf['mae']}</p>
                    <span>Indica o erro médio das previsões. Em média, as previsões da IA erraram por cerca de <strong>{perf['mae']} casos</strong> por semana, para mais ou para menos.</span>
                </div>
            </div>

            <h3>Análise Visual: Casos Reais vs. Previsões da IA</h3>
            <p>O gráfico abaixo compara os casos reais (azul) com as previsões que o modelo teria feito para o mesmo período (vermelho). Picos e vales alinhados indicam que a IA capturou bem a sazonalidade e a intensidade dos surtos.</p>
            <img src="data:image/png;base64,{perf['plot_real_vs_predito']}" alt="Gráfico Real vs. Predito">
            
            <div class="insight-box">
                <strong>Análise do Gráfico:</strong> Observe os períodos de grandes surtos. O modelo consegue prever a subida e a descida dos casos? Onde ele erra mais? Essas discrepâncias podem indicar eventos atípicos que o modelo não foi treinado para prever (ex: introdução de um novo sorotipo do vírus, mudanças de comportamento da população).
            </div>

            <h3>Análise de Erros: Onde e Como o Modelo Erra?</h3>
            <p>Nenhum modelo é perfeito. Entender seus erros nos ajuda a usá-lo com mais sabedoria. O gráfico à esquerda mostra a distribuição dos erros: a maioria se concentra perto de zero, o que é um bom sinal. O da direita mostra se o modelo tende a errar mais em surtos grandes (pontos longe da linha vermelha).</p>
            <img src="data:image/png;base64,{perf['plot_error_analysis']}" alt="Análise de Erros">
            
            <div class="insight-box">
                <strong>Análise do Gráfico de Erros:</strong> Se a barra mais alta no histograma (esquerda) está à direita do zero, o modelo tende a <strong>subestimar</strong> os casos. Se está à esquerda, tende a <strong>superestimar</strong>. O gráfico de dispersão (direita) revela se o modelo tem dificuldade com picos de casos (pontos muito acima ou abaixo da linha tracejada em valores altos).
            </div>

            <h2>2. Decifrando os Gatilhos da Dengue</h2>
            <p>O modelo aprendeu a associar variáveis climáticas com o aumento ou diminuição dos casos. Esta seção revela quais são essas associações.</p>

            <h3>Correlação: O que Anda Junto com a Dengue?</h3>
            <p>O mapa de calor abaixo mostra a força da relação entre todas as variáveis. Cores quentes (vermelho/laranja) indicam uma correlação positiva (quando um sobe, o outro também sobe). Cores frias (azul) indicam correlação negativa.</p>
            <img src="data:image/png;base64,{drivers['plot_correlation_heatmap']}" alt="Heatmap de Correlação">
            
            <div class="insight-box">
                <strong>Principais Relações Identificadas:</strong>
                <ul>{drivers_text}</ul>
                <strong>Importante:</strong> Correlação não é causalidade. A IA identifica padrões, que devem ser interpretados à luz do conhecimento epidemiológico.
            </div>

            <h3>Análise de Defasagem (Lag): O "Relógio" da Dengue</h3>
            <p>Esta é uma das análises mais importantes para o planejamento. O gráfico mostra o "timing" de influência de cada variável climática. O pico de cada linha indica em quantas semanas o impacto daquela variável nos casos de dengue é máximo.</p>
            <img src="data:image/png;base64,{drivers['plot_lag_analysis']}" alt="Análise de Defasagem">
            
            <div class="insight-box">
                <strong>Janelas de Oportunidade para Ação:</strong>
                <ul>{lag_text}</ul>
                <p>Este conhecimento permite que as ações de controle vetorial e campanhas de conscientização sejam iniciadas com antecedência estratégica, atuando <strong>antes</strong> do surto se estabelecer.</p>
            </div>

            <h2>3. Sazonalidade e Períodos de Alto Risco</h2>
            <p>A dengue possui um ciclo anual bem definido. O gráfico abaixo mostra o "ano típico" da dengue em <strong>{municipio_name}</strong>, combinando a média de casos com as médias climáticas para cada semana do ano.</p>
            <img src="data:image/png;base64,{season['plot_seasonality']}" alt="Perfil Sazonal">

            <div class="insight-box">
                <strong>Interpretando o Ciclo Anual:</strong>
                <ul>
                    <li><strong>Início da Estação:</strong> Observe quando a linha vermelha (casos) começa a subir consistentemente. Isso geralmente ocorre após o aumento da temperatura (laranja) e da precipitação (azul).
                    <li><strong>Pico da Estação:</strong> Identifique as semanas do ano com a maior média histórica de casos. Este é o período de alerta máximo.
                    <li><strong>Fim da Estação:</strong> Veja quando os casos, a temperatura e a chuva começam a diminuir, indicando uma redução natural do risco.
                </ul>
            </div>

            <h2>4. Recomendações Estratégicas Baseadas na IA</h2>
            <p>Com base em toda a análise, aqui estão algumas recomendações estratégicas para o controle da dengue em <strong>{municipio_name}</strong>:</p>
            
            <h3>Plano de Ação Sugerido:</h3>
            <ol>
                <li><strong>Monitoramento de Gatilhos:</strong> Acompanhe semanalmente as variáveis de <strong>{drivers['correlations'].index[0]}</strong> e <strong>{drivers['correlations'].index[1]}</strong>. Utilize-as como um sistema de alerta precoce.</li>
                <li><strong>Ações Preventivas com Timing Estratégico:</strong> Baseado na análise de defasagem, inicie a intensificação do controle vetorial (visitas domiciliares, limpeza de criadouros, etc.) e campanhas de comunicação entre <strong>{min(drivers['lag_peaks']['Precipitação (mm)'][0], drivers['lag_peaks']['Temperatura Média (°C)'][0])} e {max(drivers['lag_peaks']['Precipitação (mm)'][0], drivers['lag_peaks']['Temperatura Média (°C)'][0])} semanas após</strong> a ocorrência de chuvas fortes e períodos de calor intenso.</li>
                <li><strong>Foco Sazonal:</strong> Concentre recursos e pessoal durante o período de pico sazonal identificado no "ano típico", mas mantenha a vigilância durante o ano todo, especialmente diante de eventos climáticos anormais.</li>
                <li><strong>Uso Contínuo da IA:</strong> Utilize as previsões futuras do modelo (não abordadas neste relatório de análise histórica) como uma ferramenta complementar para alocação de recursos e planejamento de médio prazo.</li>
            </ol>
            
            <p style="text-align:center; margin-top: 50px; font-style:italic;">--- Fim do Relatório ---</p>
        </div>
    </body>
    </html>
    """
    
    filename = f"Relatorio_IA_Dengue_{municipio_name.replace(' ', '_')}.html"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html_template)
    print(f"\nRelatório salvo com sucesso como: '{filename}'")


def main():
    """
    Função principal para carregar o modelo e os dados, e iniciar a análise.
    """
    print("--- Iniciando a Análise de Padrões do Modelo de Dengue (Nível 78) ---")
    
    if not os.path.exists(MODEL_PATH) or not os.path.exists(DATA_PATH):
        print(f"Erro: Arquivos de modelo ou dados não encontrados. Verifique os caminhos: {MODEL_PATH} e {DATA_PATH}")
        return

    try:
        model = load_model(MODEL_PATH)
        df = pd.read_parquet(DATA_PATH)
        df['codigo_ibge'] = df['codigo_ibge'].astype(int)
        df = df.sort_values(by=['codigo_ibge', 'ano', 'semana'])
    except Exception as e:
        print(f"Erro ao carregar o modelo ou dados: {e}")
        return

    municipios = df[['codigo_ibge', 'municipio']].drop_duplicates().sort_values('codigo_ibge').reset_index(drop=True)

    while True:
        print("\n--- Digite o código IBGE do município para análise ou '0' para sair ---")
        try:
            input_code_str = input("Digite o código IBGE: ").strip()
            if input_code_str == '0':
                print("Encerrando o programa.")
                break
            input_code = int(input_code_str)
        except ValueError:
            print("Entrada inválida. Por favor, digite um código IBGE válido ou '0'.")
            continue
        
        if input_code not in municipios['codigo_ibge'].values:
            print(f"Código IBGE {input_code} não encontrado no dataset. Tente novamente.")
            continue

        selected_row = municipios[municipios['codigo_ibge'] == input_code].iloc[0]
        selected_municipio_code = selected_row['codigo_ibge']
        selected_municipio_name = selected_row['municipio']
        
        print(f"\n--- Gerando Relatório Detalhado para {selected_municipio_name} ---")
        
        df_mun = df[df['codigo_ibge'] == selected_municipio_code].copy()

        scaler_dyn_path = os.path.join(SCALER_DIR, f"{selected_municipio_code}_dynamic.pkl")
        scaler_static_path = os.path.join(SCALER_DIR, f"{selected_municipio_code}_static.pkl")
        if not os.path.exists(scaler_dyn_path) or not os.path.exists(scaler_static_path):
            print(f"Arquivos de scaler para o município {selected_municipio_code} não encontrados. Não é possível continuar.")
            continue
        
        scaler_dyn = joblib.load(scaler_dyn_path)
        scaler_static = joblib.load(scaler_static_path)
        
        # 1. Preparar dados
        dynamic_features = list(FEATURE_NAMES_PT.keys())
        dynamic_features.remove("numero_casos")
        dynamic_features.insert(0, "numero_casos") # Garantir a ordem

        dynamic_data = df_mun[dynamic_features].values
        dynamic_scaled = scaler_dyn.transform(dynamic_data)
        y_true = inverse_transform_cases(scaler_dyn, dynamic_scaled[:, 0])
        dates = get_dates_from_df(df_mun)
        
        X_mun = []
        static_mun = []
        static_data = df_mun[["latitude", "longitude"]].iloc[0].values.reshape(1, -1)
        static_scaled = scaler_static.transform(static_data)
        for i in range(len(dynamic_scaled) - SEQUENCE_LENGTH):
            X_mun.append(dynamic_scaled[i : i + SEQUENCE_LENGTH, :])
            static_mun.append(static_scaled[0])
        
        historical_predictions = np.array([])
        if len(X_mun) > 0:
            X_mun = np.array(X_mun, dtype=np.float32)
            static_mun = np.array(static_mun, dtype=np.float32)
            historical_predictions_scaled = model.predict([X_mun, static_mun], verbose=0).flatten()
            historical_predictions = inverse_transform_cases(scaler_dyn, historical_predictions_scaled)

        # Dataframe para correlações e análises, com nomes amigáveis
        df_for_analysis = pd.DataFrame(dynamic_data, columns=dynamic_features)
        df_for_analysis.rename(columns=FEATURE_NAMES_PT, inplace=True)
        
        # 2. Gerar todas as análises
        all_insights = {}
        print("1/3 - Analisando performance do modelo...")
        all_insights['performance'] = analyze_model_performance(dates, y_true, historical_predictions)
        
        print("2/3 - Analisando gatilhos e drivers climáticos...")
        all_insights['drivers'] = analyze_dengue_drivers(df_for_analysis)
        
        print("3/3 - Analisando perfil sazonal...")
        all_insights['seasonality'] = analyze_seasonality(df_mun, df_for_analysis)
        
        # 3. Gerar o relatório HTML
        generate_html_report(selected_municipio_name, selected_municipio_code, all_insights)

if __name__ == "__main__":
    main()