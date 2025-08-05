import pandas as pd
import io
import sys

def analyze_dataset(file_path):
    """
    Reads a Parquet file, prints essential information for LSTM modeling,
    and returns a formatted string of the analysis.
    """
    analysis_output = io.StringIO()
    sys.stdout = analysis_output

    try:
        print("--- Lendo o arquivo Parquet... ---\n")
        df = pd.read_parquet(file_path)
        print("--- Análise inicial concluída. ---")

        print("\n--- Informações para Modelagem LSTM ---")
        
        # 1. Estrutura do DataFrame
        print("\n**1. Estrutura e tipos de dados:**")
        df.info()

        # 2. Amostra dos dados
        print("\n**2. Amostra das primeiras 5 linhas:**")
        print(df.head())

        # 3. Variáveis e seus valores únicos
        print("\n**3. Contagem de valores únicos por coluna:**")
        for col in df.columns:
            print(f"  - '{col}': {df[col].nunique()} valores únicos")

        # 4. Dados Ausentes (missing values)
        print("\n**4. Contagem de dados ausentes por coluna:**")
        print(df.isnull().sum())

        # 5. Dados Temporais (min e max)
        # Assumindo que uma das colunas é a data ou semana
        temporal_columns = [col for col in df.columns if 'ano' in col.lower() or 'semana' in col.lower() or 'data' in col.lower()]
        if temporal_columns:
            print("\n**5. Intervalo de dados temporais (Ano/Semana):**")
            for col in temporal_columns:
                print(f"  - Coluna '{col}': Min: {df[col].min()}, Max: {df[col].max()}")
        else:
            print("\n**5. Sem colunas temporais identificadas (como 'ano' ou 'semana').**")

        # 6. Análise da variável alvo
        # Assumindo que a variável alvo é 'casos'
        if 'casos' in df.columns:
            print("\n**6. Estatísticas da variável alvo ('casos'):**")
            print(df['casos'].describe())
        else:
            print("\n**6. Coluna 'casos' não encontrada.**")

        # 7. Análise das variáveis climáticas
        climatic_columns = [col for col in df.columns if 'temperatura' in col.lower() or 'chuva' in col.lower() or 'precipitacao' in col.lower()]
        if climatic_columns:
            print("\n**7. Estatísticas das variáveis climáticas:**")
            for col in climatic_columns:
                print(f"\n  - Coluna '{col}':")
                print(df[col].describe())
        else:
            print("\n**7. Nenhuma coluna climática identificada.**")

    except FileNotFoundError:
        print(f"Erro: O arquivo '{file_path}' não foi encontrado.")
    except Exception as e:
        print(f"Ocorreu um erro: {e}")

    sys.stdout = sys.__stdout__
    return analysis_output.getvalue()

if __name__ == "__main__":
    file_path = "../data/final_training_data.parquet"
    output_text = analyze_dataset(file_path)

    print(output_text)

    # Opcionalmente, salva a saída em um arquivo para facilitar o envio
    with open("analise_dados_output.txt", "w") as f:
        f.write(output_text)
    
    print("\n--- A análise completa foi salva em 'analise_dados_output.txt'. ---")
    print("--- Por favor, copie e cole o conteúdo deste arquivo para mim. ---")