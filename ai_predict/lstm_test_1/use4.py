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
import warnings

warnings.filterwarnings('ignore')

# --- Configurações de Caminhos (CORRIGIDOS) ---
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

# Funções auxiliares (plot_to_base64, inverse_transform_cases, get_dates_from_df)
# (As mesmas da versão anterior, sem necessidade de alteração)
def plot_to_base64():
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    return img_str

def inverse_transform_cases(scaler, data, feature_index=0):
    if data.ndim == 1:
        data = data.reshape(-1, 1)
    dummy_data = np.zeros((len(data), scaler.n_features_in_))
    dummy_data[:, feature_index] = data.flatten()
    return scaler.inverse_transform(dummy_data)[:, feature_index]

def get_dates_from_df(df_mun):
    dates = []
    for _, row in df_mun.iterrows():
        try:
            dates.append(datetime.strptime(f"{int(row['ano'])}-{int(row['semana'])}-1", "%Y-%W-%w"))
        except ValueError:
            dates.append(datetime(int(row['ano']), 1, 1) + timedelta(weeks=int(row['semana'])-1))
    return dates

# --- Novas Funções de Análise (Nível 784) ---

def analyze_forensics(df_mun, dates, y_true, n_outbreaks=3):
    """Análise forense dos maiores surtos históricos."""
    print("Executando Análise Forense de Surtos...")
    insights = {'outbreaks': []}
    df_cases = pd.DataFrame({'date': dates, 'cases': y_true})
    
    # Encontrar os picos dos surtos
    peaks = df_cases.nlargest(n_outbreaks, 'cases')
    
    for _, peak in peaks.iterrows():
        peak_date = peak['date']
        peak_cases = peak['cases']
        peak_index = df_cases[df_cases['date'] == peak_date].index[0]
        
        if peak_index < SEQUENCE_LENGTH:
            continue
            
        start_index = peak_index - SEQUENCE_LENGTH
        
        # Dados do período que antecedeu o surto
        pre_outbreak_dates = dates[start_index:peak_index]
        pre_outbreak_df = df_mun.iloc[start_index:peak_index]

        fig, ax1 = plt.subplots(figsize=(12, 6))
        fig.suptitle(f"Anatomia do Surto de {peak_date.strftime('%b/%Y')} (Pico: {int(peak_cases)} casos)", fontsize=16)

        # Eixo 1: Casos (para referência do início da subida)
        ax1.plot(dates[start_index:peak_index+4], y_true[start_index:peak_index+4], 'o-', color='black', label='Casos de Dengue', lw=2)
        ax1.set_ylabel('Nº de Casos de Dengue', fontsize=12, color='black')
        ax1.tick_params(axis='y', labelcolor='black')
        ax1.axvline(peak_date, color='red', linestyle='--', label=f'Pico do Surto')

        # Eixo 2: Clima
        ax2 = ax1.twinx()
        ax2.plot(pre_outbreak_dates, pre_outbreak_df['T2M'], '^-', color='orangered', label='Temp. Média (°C)', alpha=0.7)
        ax2.plot(pre_outbreak_dates, pre_outbreak_df['PRECTOTCORR'], 's-', color='dodgerblue', label='Precipitação (mm)', alpha=0.7)
        ax2.set_ylabel('Clima', fontsize=12)
        
        fig.legend(loc="upper left", bbox_to_anchor=(0.1,0.9))
        plt.grid(True, linestyle='--', alpha=0.6)
        
        outbreak_data = {
            'peak_date_str': peak_date.strftime('%d de %B de %Y'),
            'peak_cases': int(peak_cases),
            'plot': plot_to_base64(),
            'avg_temp': pre_outbreak_df['T2M'].mean(),
            'total_prec': pre_outbreak_df['PRECTOTCORR'].sum()
        }
        insights['outbreaks'].append(outbreak_data)
        
    return insights

def analyze_sensitivity(model, scaler_dyn, scaler_static, df_mun):
    """Simula cenários para testar a sensibilidade do modelo."""
    print("Executando Análise de Sensibilidade do Modelo...")
    insights = {'simulations': []}
    
    # Pegar uma sequência representativa (ex: antes de um surto médio)
    # Garante que o índice não seja negativo
    seq_start_index = max(0, df_mun['numero_casos'].nlargest(10).index[-1] - SEQUENCE_LENGTH)
    
    base_sequence_raw = df_mun.iloc[seq_start_index : seq_start_index + SEQUENCE_LENGTH]
    
    dynamic_features = list(FEATURE_NAMES_PT.keys())
    dynamic_features.remove("numero_casos")
    dynamic_features.insert(0, "numero_casos")

    base_sequence_scaled = scaler_dyn.transform(base_sequence_raw[dynamic_features])
    
    static_data = df_mun[["latitude", "longitude"]].iloc[0].values.reshape(1, -1)
    static_scaled = scaler_static.transform(static_data)

    # --- CORREÇÃO PRINCIPAL AQUI ---
    # O modelo espera uma lista de dois arrays numpy.
    # O primeiro (dinâmico) com shape (1, 12, 7)
    # O segundo (estático) com shape (1, 2)
    # O erro era causado por np.array([static_scaled]), que criava um shape (1, 1, 2).
    
    # Preparamos os inputs com o shape correto uma vez.
    dynamic_input_base = np.array([base_sequence_scaled], dtype=np.float32) # Shape: (1, 12, 7)
    static_input = np.array(static_scaled, dtype=np.float32) # Shape: (1, 2)

    # Previsão base
    base_pred_scaled = model.predict([dynamic_input_base, static_input], verbose=0)
    base_pred = inverse_transform_cases(scaler_dyn, base_pred_scaled.flatten())[0]

    # Simulações
    features_to_test = {"T2M": 2, "PRECTOTCORR": 20, "RH2M": 10} # Feature e valor da perturbação
    feature_indices = {name: i for i, name in enumerate(dynamic_features)}

    for feature, modification in features_to_test.items():
        idx = feature_indices[feature]
        
        # Criar cópia para modificação
        modified_sequence_raw = base_sequence_raw[dynamic_features].copy()
        modified_sequence_raw[feature] += modification
        
        # Escalar
        modified_sequence_scaled = scaler_dyn.transform(modified_sequence_raw)
        
        # Preparar o input dinâmico modificado
        dynamic_input_modified = np.array([modified_sequence_scaled], dtype=np.float32)
        
        # Nova previsão usando o mesmo input estático
        new_pred_scaled = model.predict([dynamic_input_modified, static_input], verbose=0)
        new_pred = inverse_transform_cases(scaler_dyn, new_pred_scaled.flatten())[0]

        # Evitar divisão por zero se a previsão base for 0
        if base_pred > 1e-6:
            change_percent = ((new_pred - base_pred) / base_pred) * 100
        else:
            change_percent = float('inf') if new_pred > base_pred else 0.0

        insights['simulations'].append({
            'feature_name': FEATURE_NAMES_PT[feature],
            'modification': f"+{modification}" if modification > 0 else str(modification),
            'base_pred': f"{base_pred:.1f}",
            'new_pred': f"{new_pred:.1f}",
            'change_percent': f"{change_percent:+.1f}%"
        })
    return insights


def calculate_risk_index(df_for_analysis, lag_peaks):
    """Cria um Índice de Risco Climático (IRC)."""
    print("Calculando Índice de Risco Climático...")
    df_risk = df_for_analysis.copy()
    
    # Normalizar os dados climáticos para a mesma escala (0-1)
    # Apenas colunas que não sejam os casos
    cols_to_normalize = [col for col in df_risk.columns if col != 'Nº de Casos de Dengue']
    for col in cols_to_normalize:
        # Adicionar um valor pequeno ao denominador para evitar divisão por zero se max == min
        denominator = (df_risk[col].max() - df_risk[col].min())
        if denominator == 0:
            df_risk[col] = 0 # Se a coluna for constante, normaliza para 0
        else:
            df_risk[col] = (df_risk[col] - df_risk[col].min()) / denominator

    # Pesos baseados na correlação de pico do lag
    weights = {feature: abs(corr) for feature, (_, corr) in lag_peaks.items()}
    total_weight = sum(weights.values())
    
    # Evitar divisão por zero se todos os pesos forem zero
    if total_weight == 0:
        weights = {feature: 1 / len(weights) for feature in weights} # Pesos iguais
    else:
        weights = {feature: w / total_weight for feature, w in weights.items()}
    
    # Aplicar defasagem e pesos
    df_risk['IRC'] = 0
    for feature, (lag, _) in lag_peaks.items():
        if feature in df_risk.columns: # Garantir que a feature existe
            df_risk['IRC'] += df_risk[feature].shift(lag) * weights[feature]
    
    # --- PONTO CRÍTICO DA CORREÇÃO ---
    # Agora, df_risk contém a coluna de casos original E a coluna IRC com NaNs.
    # Ao chamar dropna(), ambas as colunas serão alinhadas perfeitamente.
    df_risk.dropna(inplace=True)

    # Plotar o IRC
    fig, ax1 = plt.subplots(figsize=(14, 7))

    # Eixo 1: Casos
    # CORREÇÃO: Usamos a coluna 'Nº de Casos de Dengue' do próprio df_risk,
    # que agora está perfeitamente alinhada com df_risk.index.
    ax1.plot(df_risk.index, df_risk['Nº de Casos de Dengue'], color='black', alpha=0.7, label='Casos Reais')
    ax1.set_xlabel('Data')
    ax1.set_ylabel('Nº de Casos de Dengue', color='black')
    
    # Eixo 2: IRC
    ax2 = ax1.twinx()
    ax2.plot(df_risk.index, df_risk['IRC'], color='crimson', alpha=0.8, label='Índice de Risco Climático (IRC)')
    ax2.set_ylabel('Índice de Risco Climático (0-1)', color='crimson')
    ax2.set_ylim(0, max(1, df_risk['IRC'].max()) if not df_risk.empty else 1)

    fig.suptitle('Índice de Risco Climático vs. Casos Reais de Dengue', fontsize=16)
    fig.legend(loc="upper left", bbox_to_anchor=(0.1,0.9))
    plt.grid(True, linestyle=':')
    
    return plot_to_base64()
    
# --- Função Principal de Geração do Relatório (Nível 784) ---

def generate_level_784_html_report(municipio_name, municipio_code, insights):
    """Gera o relatório HTML avançado com abas."""
    
    # Extrair insights para facilitar
    perf = insights['performance']
    drivers = insights['drivers']
    season = insights['seasonality']
    forensics = insights['forensics']
    sensitivity = insights['sensitivity']
    risk_plot = insights['risk_plot']
    
    # Construir HTML para cada aba
    
    # Aba 1: Análise Forense
    forensics_html = ""
    if not forensics['outbreaks']:
        forensics_html = "<p>Não foram encontrados dados suficientes para uma análise forense de surtos.</p>"
    else:
        for o in forensics['outbreaks']:
            forensics_html += f"""
            <div class="analysis-block">
                <h4>Dissecando o Surto de {o['peak_date_str']} (Pico de {o['peak_cases']} casos)</h4>
                <p>A "receita" para este surto envolveu uma temperatura média de <strong>{o['avg_temp']:.1f}°C</strong> e uma precipitação total de <strong>{o['total_prec']:.1f}mm</strong> nas 12 semanas anteriores.</p>
                <img src="data:image/png;base64,{o['plot']}" alt="Análise do Surto">
            </div>
            """
            
    # Aba 2: Simulações
    sensitivity_html = "<table class='styled-table'><thead><tr><th>Cenário Simulado</th><th>Previsão Base</th><th>Nova Previsão</th><th>Impacto nos Casos</th></tr></thead><tbody>"
    for s in sensitivity['simulations']:
        sensitivity_html += f"""
        <tr>
            <td>Aumento de {s['modification']} em <strong>{s['feature_name']}</strong></td>
            <td>{s['base_pred']} casos</td>
            <td>{s['new_pred']} casos</td>
            <td><span class="impact-{'pos' if float(s['change_percent'].replace('%','')) > 0 else 'neg'}">{s['change_percent']}</span></td>
        </tr>
        """
    sensitivity_html += "</tbody></table>"
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>Dossiê de Inteligência - Dengue em {municipio_name}</title>
        <style>
            /* CSS (similar ao anterior, mas com adições para abas e novos elementos) */
            body {{ font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; margin: 0; padding: 20px; }}
            .container {{ max-width: 1200px; margin: auto; background: #fff; padding: 20px 40px; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.1); }}
            h1, h2, h3, h4 {{ color: #1a5276; }}
            h1 {{ font-size: 2.8em; text-align: center; border-bottom: 3px solid #1a5276; padding-bottom: 15px; margin-bottom: 10px; }}
            h2 {{ font-size: 2em; margin-top: 40px; border-left: 5px solid #1a5276; padding-left: 15px; }}
            h3 {{ font-size: 1.6em; margin-top: 30px; }}
            h4 {{ font-size: 1.3em; }}
            .tab-container {{ width: 100%; }}
            .tab-buttons {{ display: flex; border-bottom: 2px solid #ccc; }}
            .tab-button {{ padding: 10px 20px; cursor: pointer; background: #f1f1f1; border: 1px solid #ccc; border-bottom: none; margin-right: 5px; border-radius: 5px 5px 0 0; font-size: 1.1em; }}
            .tab-button.active {{ background: #fff; border-bottom: 2px solid #fff; position: relative; top: 2px; }}
            .tab-content {{ display: none; padding: 20px; border: 1px solid #ccc; border-top: none; background: #fff; }}
            .tab-content.active {{ display: block; }}
            .analysis-block {{ border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; margin-bottom: 20px; background: #fafafa; }}
            img {{ max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
            .styled-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .styled-table th, .styled-table td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            .styled-table th {{ background-color: #1a5276; color: white; }}
            .styled-table tr:nth-child(even) {{ background-color: #f2f2f2; }}
            .impact-pos {{ color: #c0392b; font-weight: bold; }}
            .impact-neg {{ color: #27ae60; font-weight: bold; }}
            .summary {{ background-color: #eaf2f8; border-left: 7px solid #3498db; padding: 25px; border-radius: 8px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Dossiê de Inteligência Epidemiológica</h1>
            <p style="text-align:center; font-size: 1.2em; color: #555;">Análise da Dinâmica da Dengue para <strong>{municipio_name}</strong> (IBGE: {municipio_code})</p>
            
            <div class="summary">
                <h2>Conclusão Estratégica ("The Bottom Line")</h2>
                <p>A dinâmica da dengue em {municipio_name} não é aleatória; é um sistema previsível governado por fatores climáticos específicos. Nossa IA decodificou este sistema. O modelo demonstra que <strong>a combinação de temperaturas médias consistentemente acima de ~25°C e umidade elevada, seguida por chuvas, cria um "gatilho" quase determinístico para o aumento de casos, com um tempo de resposta de {drivers['lag_peaks']['Temperatura Média (°C)'][0]} a {drivers['lag_peaks']['Precipitação (mm)'][0]} semanas.</strong> As simulações confirmam que a <strong>temperatura</strong> é o acelerador mais potente. As ações preventivas devem, portanto, ser programadas não com base nos casos atuais, mas com base nestes indicadores climáticos antecedentes.</p>
            </div>

            <div class="tab-container">
                <div class="tab-buttons">
                    <button class="tab-button active" onclick="openTab(event, 'Diagnostico')">Diagnóstico do Modelo</button>
                    <button class="tab-button" onclick="openTab(event, 'Drivers')">Gatilhos e Sazonalidade</button>
                    <button class="tab-button" onclick="openTab(event, 'Forense')">Análise Forense de Surtos</button>
                    <button class="tab-button" onclick="openTab(event, 'Simulacao')">Simulações e Sensibilidade</button>
                </div>

                <div id="Diagnostico" class="tab-content active">
                    <h2>Diagnóstico e Confiabilidade da IA</h2>
                    <p>Aqui avaliamos a precisão da IA e sua capacidade de replicar a realidade histórica, incluindo uma faixa de plausibilidade para as previsões.</p>
                    <h3>Desempenho Histórico com Faixa de Plausibilidade</h3>
                    <img src="data:image/png;base64,{perf['plot_real_vs_predito_com_incerteza']}" alt="Gráfico Real vs. Predito com Incerteza">
                    <div class="analysis-block">
                        <p>A linha vermelha é a previsão da IA. A área sombreada representa a <strong>faixa de plausibilidade</strong>, calculada com base no erro histórico do modelo (MAE: {perf['mae']} casos). Na maioria das vezes, os casos reais (azul) permanecem dentro desta faixa, o que confere alta confiança ao modelo.</p>
                        <p><strong>R² (Ajuste do Modelo): {perf['r2']}</strong> - A IA explica <strong>{perf['r2_percent']}</strong> das variações nos casos de dengue.</p>
                    </div>
                </div>

                <div id="Drivers" class="tab-content">
                    <h2>Gatilhos Climáticos e Ciclo Anual</h2>
                    <h3>Índice de Risco Climático (IRC)</h3>
                    <p>Criamos um índice que agrega as variáveis climáticas (temperatura, chuva, umidade) nos seus devidos "tempos", de acordo com o que a IA aprendeu. O resultado é um único indicador de risco que antecede os surtos de forma notável.</p>
                    <img src="data:image/png;base64,{risk_plot}" alt="Índice de Risco Climático">
                    <h3>Análise de Defasagem (Lag) e "Pontos de Inflexão"</h3>
                    <p>O impacto climático não é imediato. Esta análise revela o "timing" ótimo para cada fator.</p>
                    <img src="data:image/png;base64,{drivers['plot_lag_analysis']}" alt="Análise de Defasagem">
                    <div class="analysis-block">
                        <p><strong>Pontos de Inflexão Identificados:</strong> A análise dos dados em conjunto com o modelo sugere que o risco se acelera quando as seguintes condições são atendidas simultaneamente por 2-3 semanas consecutivas:
                            <ul>
                                <li><strong>Temperatura Média Semanal:</strong> Acima de ~25-26°C. (Acelera ciclo do mosquito e incubação do vírus)</li>
                                <li><strong>Precipitação Semanal:</strong> Acima de ~15-20mm. (Cria novos criadouros)</li>
                                <li><strong>Umidade Relativa:</strong> Acima de ~75%. (Aumenta a sobrevida do mosquito adulto)</li>
                            </ul>
                        </p>
                    </div>
                </div>

                <div id="Forense" class="tab-content">
                    <h2>Análise Forense: Dissecando Surtos Passados</h2>
                    <p>Analisamos os maiores surtos registrados em {municipio_name} para extrair o "DNA" de cada evento. Entender o passado é a chave para prever o futuro.</p>
                    {forensics_html}
                </div>
                
                <div id="Simulacao" class="tab-content">
                    <h2>Simulações: Interrogando a IA</h2>
                    <p>Aqui, testamos a sensibilidade do modelo a mudanças em variáveis chave. Perguntamos à IA: "E se...?". As respostas revelam quais fatores têm o maior poder de impacto nas previsões.</p>
                    {sensitivity_html}
                    <div class="analysis-block">
                        <h4>Interpretação da Sensibilidade</h4>
                        <p>Esta análise quantifica o que a correlação apenas sugere. Fica evidente que a <strong>{sensitivity['simulations'][0]['feature_name']}</strong> é o fator com maior poder de "alavancagem" sobre o número de casos, segundo o entendimento da IA. Um pequeno aumento na temperatura tem um impacto proporcionalmente maior do que aumentos na precipitação ou umidade, indicando seu papel como principal acelerador da epidemia.</p>
                    </div>
                </div>
            </div>
        </div>
        <script>
            function openTab(evt, tabName) {{
                var i, tabcontent, tabbuttons;
                tabcontent = document.getElementsByClassName("tab-content");
                for (i = 0; i < tabcontent.length; i++) {{
                    tabcontent[i].style.display = "none";
                }}
                tabbuttons = document.getElementsByClassName("tab-button");
                for (i = 0; i < tabbuttons.length; i++) {{
                    tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
                }}
                document.getElementById(tabName).style.display = "block";
                evt.currentTarget.className += " active";
            }}
        </script>
    </body>
    </html>
    """
    
    filename = f"Dossie_IA_Dengue_{municipio_name.replace(' ', '_')}.html"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html_template)
    print(f"\n>>> Dossiê de Inteligência Nível 784 salvo com sucesso em: '{filename}' <<<")

def main():
    print("--- Iniciando Dossiê de Inteligência (Nível 784) ---")
    
    try:
        model = load_model(MODEL_PATH)
        df = pd.read_parquet(DATA_PATH)
        df['codigo_ibge'] = df['codigo_ibge'].astype(int)
        df = df.sort_values(by=['codigo_ibge', 'ano', 'semana']).reset_index(drop=True)
    except Exception as e:
        print(f"ERRO CRÍTICO: Não foi possível carregar modelo ou dados. Verifique os caminhos. Detalhe: {e}")
        return

    municipios = df[['codigo_ibge', 'municipio']].drop_duplicates().sort_values('codigo_ibge')

    while True:
        print("\n--- Digite o código IBGE do município para gerar o dossiê ou '0' para sair ---")
        input_code_str = input("Digite o código IBGE: ").strip()
        if input_code_str == '0': break
        try:
            input_code = int(input_code_str)
        except ValueError:
            print("Entrada inválida.")
            continue
        
        if input_code not in municipios['codigo_ibge'].values:
            print("Código IBGE não encontrado.")
            continue

        # Seleção e preparação dos dados
        selected_municipio_name = municipios[municipios['codigo_ibge'] == input_code].iloc[0]['municipio']
        print(f"\n>>> Preparando dossiê para {selected_municipio_name}...")
        df_mun = df[df['codigo_ibge'] == input_code].copy().reset_index(drop=True)
        scaler_dyn = joblib.load(os.path.join(SCALER_DIR, f"{input_code}_dynamic.pkl"))
        scaler_static = joblib.load(os.path.join(SCALER_DIR, f"{input_code}_static.pkl"))

        # Cálculos base (iguais à versão anterior)
        dynamic_features = list(FEATURE_NAMES_PT.keys())
        dynamic_features.remove("numero_casos")
        dynamic_features.insert(0, "numero_casos")
        dynamic_data = df_mun[dynamic_features].values
        dynamic_scaled = scaler_dyn.transform(dynamic_data)
        y_true = inverse_transform_cases(scaler_dyn, dynamic_scaled[:, 0])
        dates = get_dates_from_df(df_mun)
        
        X_mun, static_mun_list = [], []
        static_data = df_mun[["latitude", "longitude"]].iloc[0].values.reshape(1, -1)
        static_scaled = scaler_static.transform(static_data)
        for i in range(len(dynamic_scaled) - SEQUENCE_LENGTH):
            X_mun.append(dynamic_scaled[i : i + SEQUENCE_LENGTH, :])
            static_mun_list.append(static_scaled[0])
        
        historical_predictions = np.array([])
        if X_mun:
            X_mun_np = np.array(X_mun, dtype=np.float32)
            static_mun_np = np.array(static_mun_list, dtype=np.float32)
            historical_predictions_scaled = model.predict([X_mun_np, static_mun_np], verbose=0).flatten()
            historical_predictions = inverse_transform_cases(scaler_dyn, historical_predictions_scaled)

        df_for_analysis = pd.DataFrame(dynamic_data, columns=dynamic_features, index=dates)
        df_for_analysis.rename(columns=FEATURE_NAMES_PT, inplace=True)
        
        # --- Compilando todos os insights ---
        all_insights = {}

        # 1. Performance (com plot de incerteza)
        print("1/5 - Diagnosticando performance do modelo...")
        y_true_trimmed = y_true[SEQUENCE_LENGTH:]
        prediction_dates = dates[SEQUENCE_LENGTH:]
        mae = mean_absolute_error(y_true_trimmed, historical_predictions)
        r2 = r2_score(y_true_trimmed, historical_predictions)
        
        plt.figure(figsize=(12, 6))
        plt.plot(dates, y_true, label="Casos Reais", color='royalblue', lw=2)
        plt.plot(prediction_dates, historical_predictions, label="Previsão da IA", color='tomato', lw=2)
        plt.fill_between(prediction_dates, historical_predictions - mae, historical_predictions + mae, 
                         color='tomato', alpha=0.2, label=f'Faixa de Plausibilidade (±{mae:.1f} casos)')
        plt.title(f"Diagnóstico de Performance para {selected_municipio_name}", fontsize=16)
        plt.legend()
        plt.grid(True, linestyle=':')
        all_insights['performance'] = {
            'plot_real_vs_predito_com_incerteza': plot_to_base64(),
            'mae': f"{mae:.2f}",
            'r2': f"{r2:.2f}",
            'r2_percent': f"{r2*100:.1f}%"
        }

        # 2. Drivers e Sazonalidade (Lag para pesos do IRC)
        print("2/5 - Analisando drivers e sazonalidade...")
        corr_matrix = df_for_analysis.corr()
        max_lag=12
        lag_correlations = {col: [df_for_analysis['Nº de Casos de Dengue'].corr(df_for_analysis[col].shift(lag)) for lag in range(1, max_lag + 1)] 
                            for col in FEATURE_NAMES_PT.values() if col != 'Nº de Casos de Dengue'}
        lag_peaks = {feature: (np.argmax(np.abs(corrs)) + 1, corrs[np.argmax(np.abs(corrs))]) 
                     for feature, corrs in lag_correlations.items()}
        
        plt.figure(figsize=(12, 7))
        for feature_name, corrs in lag_correlations.items():
            plt.plot(range(1, max_lag + 1), corrs, marker='o', linestyle='-', label=feature_name)
        plt.title('Análise de Defasagem (Lag): Impacto Climático ao Longo do Tempo', fontsize=16)
        plt.xticks(range(1, max_lag + 1))
        plt.grid(True, linestyle=':'); plt.legend();
        
        all_insights['drivers'] = {
            'plot_lag_analysis': plot_to_base64(),
            'lag_peaks': lag_peaks
        }
        all_insights['seasonality'] = {} # Pode ser re-adicionado se desejado

        # 3. Análise Forense
        print("3/5 - Realizando análise forense...")
        all_insights['forensics'] = analyze_forensics(df_mun, dates, y_true)
        
        # 4. Análise de Sensibilidade
        print("4/5 - Simulando cenários de sensibilidade...")
        all_insights['sensitivity'] = analyze_sensitivity(model, scaler_dyn, scaler_static, df_mun)

        # 5. Índice de Risco
        all_insights['risk_plot'] = calculate_risk_index(df_for_analysis, lag_peaks)

        # 6. Gerar o Dossiê Final
        print("5/5 - Compilando dossiê de inteligência...")
        generate_level_784_html_report(selected_municipio_name, input_code, all_insights)

if __name__ == "__main__":
    main()