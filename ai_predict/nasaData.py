import requests
import pandas as pd

city_coords = {
    'AC': (-9.97499, -67.8243), 'AL': (-9.66599, -35.7350), 'AP': (0.0349, -51.0694),
    'AM': (-3.1187, -60.0212), 'BA': (-12.9714, -38.5014), 'CE': (-3.7172, -38.5433),
    'DF': (-15.7942, -47.8822), 'ES': (-20.3155, -40.3128), 'GO': (-16.6869, -49.2648),
    'MA': (-2.5307, -44.3068), 'MT': (-15.6014, -56.0979), 'MS': (-20.4697, -54.6201),
    'MG': (-19.9167, -43.9345), 'PA': (-1.4558, -48.4902), 'PB': (-7.1153, -34.8610),
    'PR': (-25.4284, -49.2733), 'PE': (-8.0476, -34.8770), 'PI': (-5.0892, -42.8016),
    'RJ': (-22.9068, -43.1729), 'RN': (-5.7945, -35.2110), 'RS': (-30.0346, -51.2177),
    'RO': (-8.7608, -63.8999), 'RR': (2.8238, -60.6753), 'SC': (-27.5954, -48.5480),
    'SP': (-23.5505, -46.6333), 'SE': (-10.9472, -37.0731), 'TO': (-10.1840, -48.3336)
}

parameters = "T2M,PRECTOTCORR,RH2M"
start_date = "20240101"
end_date = "20250520"

def fetch_city_data(state, lat, lon):
    url = (
        f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters={parameters}"
        f"&community=AG&longitude={lon}&latitude={lat}&start={start_date}&end={end_date}&format=JSON"
    )
    response = requests.get(url)
    data = response.json()
    
    # Extrair cada parâmetro separadamente
    daily_data = data['properties']['parameter']
    df = pd.DataFrame({
        'date': daily_data['T2M'].keys(),
        'T2M': daily_data['T2M'].values(),
        'PRECTOTCORR': daily_data['PRECTOTCORR'].values(),
        'RH2M': daily_data['RH2M'].values()
    })

    # Converter datas corretamente
    df['date'] = pd.to_datetime(df['date'], format="%Y%m%d")
    df['state'] = state
    df['week'] = df['date'].dt.isocalendar().week
    df['year'] = df['date'].dt.year

    weekly = df.groupby(['year', 'week', 'state']).mean(numeric_only=True).reset_index()
    return weekly

# Coleta de todos os estados
all_data = pd.concat([
    fetch_city_data(state, lat, lon) for state, (lat, lon) in city_coords.items()
], ignore_index=True)

# Salvar
all_data.to_csv("dados_nasa_semanal.csv", index=False)
