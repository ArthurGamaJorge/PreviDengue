import asyncio
import json
import pandas as pd
from datetime import datetime
from epiweeks import Week
import httpx

INPUT_FILE = "ai_predict/data/prev/municipios.json"
OUTPUT_FILE = "ai_predict/data/dadosClimaticos.csv"
PARAMETERS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"]

start_date = Week(2014, 1).startdate().strftime("%Y%m%d")
end_date = Week(2025, 20).enddate().strftime("%Y%m%d")

async def fetch_data(client, lat, lon):
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start_date,
        "end": end_date,
        "format": "JSON"
    }
    try:
        response = await client.get(url, params=params, timeout=30)
        if response.status_code == 200:
            return response.json().get("properties", {}).get("parameter", {})
        else:
            print(f"HTTP {response.status_code} error for lat={lat}, lon={lon}")
    except Exception as e:
        print(f"Request error for lat={lat}, lon={lon}: {e}")
    return None

def api_data_to_df(name, ibge_code, data):
    records = []
    dates = data.get(PARAMETERS[0], {}).keys()
    for date_str in dates:
        date = datetime.strptime(date_str, "%Y%m%d")
        epi_week = Week.fromdate(date)
        year_week = f"{epi_week.year}/{epi_week.week:02d}"
        row = {
            "codigo_ibge": ibge_code,
            "municipio": name,
            "ano_semana": year_week,
            "data": date
        }
        for param in PARAMETERS:
            row[param] = data.get(param, {}).get(date_str)
        records.append(row)
    df = pd.DataFrame(records)
    df = df.astype({
        "codigo_ibge": "int32",
        "T2M": "float32",
        "T2M_MAX": "float32",
        "T2M_MIN": "float32",
        "PRECTOTCORR": "float32",
        "RH2M": "float32",
        "ALLSKY_SFC_SW_DWN": "float32"
    })
    return df

def aggregate_weekly(df):
    return df.groupby(["codigo_ibge", "municipio", "ano_semana"]).agg({
        "T2M": "mean",
        "T2M_MAX": "mean",
        "T2M_MIN": "mean",
        "RH2M": "mean",
        "ALLSKY_SFC_SW_DWN": "mean",
        "PRECTOTCORR": "sum"
    }).reset_index()

async def main():
    # List of missing city IBGE codes
    missing_ibge_codes = [
        4123907,
        3500709,
        # add more codes here
    ]

    # Load municipios.json
    with open(INPUT_FILE, "r", encoding="utf-8-sig") as f:
        municipios = json.load(f)

    # Filter only cities in missing_ibge_codes
    cities_to_fetch = [m for m in municipios if m["codigo_ibge"] in missing_ibge_codes]

    if not cities_to_fetch:
        print("No matching cities found for the given IBGE codes.")
        return

    async with httpx.AsyncClient() as client:
        for city in cities_to_fetch:
            print(f"Fetching data for {city['nome']} (IBGE: {city['codigo_ibge']})")
            data = await fetch_data(client, city["latitude"], city["longitude"])
            if data:
                df = api_data_to_df(city["nome"], city["codigo_ibge"], data)
                df_weekly = aggregate_weekly(df)

                # Append to CSV without header
                df_weekly.to_csv(OUTPUT_FILE, mode='a', index=False, header=False)
                print(f"Appended data for {city['nome']}")
            else:
                print(f"Failed to get data for {city['nome']}")

if __name__ == "__main__":
    asyncio.run(main())
