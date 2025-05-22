import json
import random
import math

def gerar_dados_sinteticos(n, tendencia, alpha, surtos):
    regioes = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']
    semanas = [f'Semana {i}' for i in range(1, n+1)]

    dados = []

    for regiao in regioes:
        base = random.randint(100, 1000)
        for i, semana in enumerate(semanas):
            ruido = random.uniform(-2, 2)

            if tendencia == 'crescente':
                variacao = (math.tan(math.radians(alpha)) * i) + ruido
            elif tendencia == 'decrescente':
                variacao = (-math.tan(math.radians(alpha)) * i) + ruido
            else:
                variacao = random.uniform(-1, 1) * base * 0.1

            casos = base + base * variacao

            # simular surto
            if surtos and random.random() < 0.1:
                casos *= random.uniform(1.5, 3.0)

            casos = max(0, int(casos))  # garantir não-negativo
            dados.append({
                'regiao': regiao,
                'semana': semana,
                'casos': casos
            })

    return dados

def salvar_json(dados, filename='dados.json'):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

def ler_json(filename='dados.json'):
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)

if __name__ == "__main__":
    n = int(input("Quantas semanas? "))
    tendencia = input("Tendência (crescente/decrescente/oscilante): ").strip().lower()
    alpha = float(input("Alpha angular (graus, ex: 5 ou 15): "))
    surtos = input("Deseja simular surtos? (s/n): ").strip().lower() == 's'

    dados = gerar_dados_sinteticos(n, tendencia, alpha, surtos)
    salvar_json(dados)
    print(f"{len(dados)} registros gerados e salvos em 'dados.json'")
