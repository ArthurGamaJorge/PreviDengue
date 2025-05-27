import requests
import pandas as pd
import concurrent.futures

state_coords = {
    'AC': [(-9.97499, -67.8243), (-10.4372, -67.7676), (-8.7701, -70.7920)],  # Rio Branco + Cruzeiro do Sul + Sena Madureira
    'AL': [(-9.66599, -35.7350), (-9.6652, -35.7356), (-9.3890, -36.6236)],   # Maceió + Arapiraca + Palmeira dos Índios
    'AP': [(0.0349, -51.0694), (0.9030, -51.7910), (0.8554, -50.8151)],      # Macapá + Santana + Laranjal do Jari
    'AM': [(-3.1187, -60.0212), (-3.3349, -60.1242), (-4.2505, -69.9363)],   # Manaus + Parintins + Tefé
    'BA': [(-12.9714, -38.5014), (-13.2975, -39.2965), (-14.7800, -39.2667)], # Salvador + Feira de Santana + Vitória da Conquista
    'CE': [(-3.7172, -38.5433), (-4.0569, -39.6280), (-5.1894, -39.6926)],   # Fortaleza + Juazeiro do Norte + Sobral
    'DF': [(-15.7942, -47.8822)],  # Brasília 
    'ES': [(-20.3155, -40.3128), (-19.8236, -40.3410), (-18.7425, -41.9339)], # Vitória + Vila Velha + Colatina
    'GO': [(-16.6869, -49.2648), (-16.6720, -49.2640), (-18.1000, -50.2350)], # Goiânia + Aparecida de Goiânia + Rio Verde
    'MA': [(-2.5307, -44.3068), (-4.0579, -45.2766), (-3.7200, -41.4720)],    # São Luís + Imperatriz + Caxias
    'MT': [(-15.6014, -56.0979), (-16.4300, -54.6300), (-14.9192, -57.9961)], # Cuiabá + Rondonópolis + Sinop
    'MS': [(-20.4697, -54.6201), (-20.4428, -54.6466), (-21.3520, -55.5066)], # Campo Grande + Dourados + Corumbá
    'MG': [(-19.9167, -43.9345), (-18.5122, -44.5551), (-20.3155, -42.8448)], # Belo Horizonte + Uberlândia + Juiz de Fora
    'PA': [(-1.4558, -48.4902), (-1.3790, -48.4769), (-3.7437, -49.7058)],    # Belém + Ananindeua + Santarém
    'PB': [(-7.1153, -34.8610), (-7.1559, -34.8290), (-6.7500, -35.6600)],    # João Pessoa + Campina Grande + Patos
    'PR': [(-25.4284, -49.2733), (-24.8946, -53.4550), (-23.5489, -51.1739)], # Curitiba + Foz do Iguaçu + Londrina
    'PE': [(-8.0476, -34.8770), (-8.0689, -34.8711), (-7.9386, -35.3244)],    # Recife + Jaboatão dos Guararapes + Caruaru
    'PI': [(-5.0892, -42.8016), (-5.0892, -42.8016), (-7.2311, -41.4550)],    # Teresina + Parnaíba + Picos
    'RJ': [(-22.9068, -43.1729), (-22.9707, -43.1823), (-22.9103, -42.0160)], # Rio de Janeiro + Niterói + Volta Redonda
    'RN': [(-5.7945, -35.2110), (-5.2237, -36.0111), (-6.4631, -37.0767)],    # Natal + Mossoró + Caicó
    'RS': [(-30.0346, -51.2177), (-29.7604, -53.7037), (-27.5969, -52.2799)], # Porto Alegre + Santa Maria + Passo Fundo
    'RO': [(-8.7608, -63.8999), (-11.4350, -61.9627), (-10.4369, -62.4678)],  # Porto Velho + Ji-Paraná + Vilhena
    'RR': [(2.8238, -60.6753), (2.8900, -60.7000), (3.3489, -61.3787)],       # Boa Vista + Bonfim + Pacaraima
    'SC': [(-27.5954, -48.5480), (-27.6702, -48.5480), (-26.9205, -49.0626)], # Florianópolis + Joinville + Blumenau
    'SP': [(-23.5505, -46.6333), (-22.9035, -43.2096), (-21.7679, -47.6496)], # São Paulo + Campinas + Ribeirão Preto
    'SE': [(-10.9472, -37.0731), (-11.0307, -37.2643), (-11.1167, -37.4025)], # Aracaju + Nossa Senhora do Socorro + Lagarto
    'TO': [(-10.1840, -48.3336), (-10.1850, -48.3340), (-7.1920, -48.2100)]   # Palmas + Araguaína + Gurupi
}


parameters = "T2M,T2M_MAX,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN"
start_date = "20140101"
end_date = "20250527"

def fetch_point_data(state, lat, lon, session):
    url = (
        f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters={parameters}"
        f"&community=AG&longitude={lon}&latitude={lat}&start={start_date}&end={end_date}&format=JSON"
    )
    try:
        response = session.get(url, timeout=20)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"[ERROR] {state} ({lat:.2f},{lon:.2f}): {e}", flush=True)
        return pd.DataFrame()

    data = response.json()
    daily_data = data['properties']['parameter']

    dates = list(daily_data['T2M'].keys())
    if not dates:
        print(f"[WARNING] {state} ({lat:.2f},{lon:.2f}): No data returned", flush=True)
        return pd.DataFrame()

    last_date = pd.to_datetime(dates[-1], format="%Y%m%d")
    print(f"[INFO] {state} ({lat:.2f},{lon:.2f}) — last date fetched: {last_date.strftime('%Y-%m')}", flush=True)

    df = pd.DataFrame({
        'date': dates,
        'T2M': daily_data['T2M'].values(),
        'T2M_MAX': daily_data['T2M_MAX'].values(),
        'PRECTOTCORR': daily_data['PRECTOTCORR'].values(),
        'RH2M': daily_data['RH2M'].values(),
        'ALLSKY_SFC_SW_DWN': daily_data['ALLSKY_SFC_SW_DWN'].values()
    })

    df['date'] = pd.to_datetime(df['date'], format="%Y%m%d")
    df['state'] = state
    return df

def fetch_state_data(state, coords, session):
    # Buscar dados para todos os pontos do estado
    dfs = []
    for lat, lon in coords:
        df_point = fetch_point_data(state, lat, lon, session)
        if not df_point.empty:
            dfs.append(df_point)
    if not dfs:
        return pd.DataFrame()

    # Concatenar dados dos pontos e fazer média diária para o estado
    df_all_points = pd.concat(dfs)
    daily_state = df_all_points.groupby(['state', 'date']).mean().reset_index()

    # Agregar para semanal
    daily_state['week'] = daily_state['date'].dt.isocalendar().week
    daily_state['year'] = daily_state['date'].dt.year

    weekly_state = daily_state.groupby(['state', 'year', 'week']).agg({
        'T2M': 'mean',
        'T2M_MAX': 'mean',
        'RH2M': 'mean',
        'PRECTOTCORR': 'sum',
        'ALLSKY_SFC_SW_DWN': 'mean'
    }).reset_index()

    return weekly_state

with requests.Session() as session:
    with concurrent.futures.ThreadPoolExecutor(max_workers=40) as executor:
        results = list(executor.map(lambda sc: fetch_state_data(sc[0], sc[1], session), state_coords.items()))

# Concatenar todos os estados
all_states_data = pd.concat(results, ignore_index=True)
all_states_data.to_csv("./ai_predict/dados_nasa_semanal.csv", index=False)
