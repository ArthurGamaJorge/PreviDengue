import asyncio
import json
import pandas as pd
from datetime import date, datetime
from epiweeks import Week
import logging
import httpx
import aiofiles
import aiofiles.os

INPUT_FILE = "../municipios/municipios.json"
OUTPUT_FILE = "../dadosClimaticos.csv"
PARAMETERS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"]
MAX_REQUESTS_PER_MINUTE = 125
CONCURRENT_TASKS = 30
MAX_RETRIES = 5

UPDATE_UNTIL_WEEK = Week.fromdate(date.today()) - 3

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

class RateLimiter:
    def __init__(self, max_per_minute):
        self.delay = 60 / max_per_minute
        self.lock = asyncio.Lock()
        self.last_call = None

    async def wait(self):
        async with self.lock:
            now = asyncio.get_event_loop().time()
            if self.last_call is not None:
                elapsed = now - self.last_call
                if elapsed < self.delay:
                    await asyncio.sleep(self.delay - elapsed)
            self.last_call = asyncio.get_event_loop().time()

def get_last_week_for_municipio(df, codigo_ibge):
    df_mun = df[df["codigo_ibge"] == codigo_ibge]
    if df_mun.empty:
        return None
    last_week_str = df_mun["ano_semana"].max()  # ex: "2020/52"
    year, week = map(int, last_week_str.split('/'))
    return Week(year, week)

async def fetch_data(client, rate_limiter, lat, lon, start_date, end_date):
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

    for attempt in range(MAX_RETRIES):
        await rate_limiter.wait()
        try:
            response = await client.get(url, params=params, timeout=30)
            if response.status_code == 200:
                return response.json().get("properties", {}).get("parameter", {})
            elif response.status_code == 429:
                logging.warning("Rate limited by API, backing off 60s...")
                await asyncio.sleep(60)
            else:
                logging.warning(f"HTTP {response.status_code} on attempt {attempt+1}")
        except (httpx.RequestError, asyncio.TimeoutError) as e:
            logging.error(f"Request error on attempt {attempt+1}: {e}")
        await asyncio.sleep(2 ** attempt)  # backoff exponencial
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

async def write_df(df, first_write):
    mode = "w" if first_write else "a"
    header = first_write
    async with aiofiles.open(OUTPUT_FILE, mode, encoding="utf-8") as f:
        csv_str = df.to_csv(index=False, header=header, lineterminator="\n")
        await f.write(csv_str)

async def process_municipio(municipio, client, rate_limiter, semaphore, first_write_flag, idx, total, df_existing):
    async with semaphore:
        codigo_ibge = municipio["codigo_ibge"]
        name = municipio["nome"]

        last_week = get_last_week_for_municipio(df_existing, codigo_ibge)
        if last_week is None:
            start_week = Week(2014, 1)
        else:
            start_week = last_week + 1
        
        if start_week > UPDATE_UNTIL_WEEK:
            logging.info(f"{name} already updated until {last_week}. Skipping.")
            return

        start_date_str = start_week.startdate().strftime("%Y%m%d")
        end_date_str = UPDATE_UNTIL_WEEK.enddate().strftime("%Y%m%d")

        logging.info(f"[{idx}/{total}] Fetching {name} weeks {start_week} to {UPDATE_UNTIL_WEEK}")
        data = await fetch_data(client, rate_limiter, municipio["latitude"], municipio["longitude"], start_date_str, end_date_str)

        if data:
            df_new = api_data_to_df(name, codigo_ibge, data)
            df_weekly = aggregate_weekly(df_new)
            await write_df(df_weekly, first_write_flag[0])
            if first_write_flag[0]:
                first_write_flag[0] = False
            logging.info(f"{name} updated with weeks {start_week} to {UPDATE_UNTIL_WEEK}")
        else:
            logging.warning(f"Failed to get data for {name}")

async def sort_and_save_csv(file_path):
    df = pd.read_csv(file_path, dtype={"codigo_ibge": "int32", "ano_semana": "string"})
    df = df.sort_values(by=["municipio", "ano_semana"])
    df.to_csv(file_path, index=False)

async def main():
    async with aiofiles.open(INPUT_FILE, "r", encoding="utf-8-sig") as f:
        municipios = json.loads(await f.read())

    # Remove duplicates
    unique = {m["codigo_ibge"]: m for m in municipios}
    municipios = list(unique.values())

    df_existing = pd.DataFrame()
    if await aiofiles.os.path.exists(OUTPUT_FILE):
        df_existing = pd.read_csv(OUTPUT_FILE, dtype={"codigo_ibge": "int32", "ano_semana": "string"})

    rate_limiter = RateLimiter(MAX_REQUESTS_PER_MINUTE)
    semaphore = asyncio.Semaphore(CONCURRENT_TASKS)
    first_write_flag = [df_existing.empty]

    async with httpx.AsyncClient() as client:
        tasks = [process_municipio(m, client, rate_limiter, semaphore, first_write_flag, i+1, len(municipios), df_existing) for i, m in enumerate(municipios)]
        await asyncio.gather(*tasks)

    logging.info("✅ Climate data collection complete.")
    await sort_and_save_csv(OUTPUT_FILE)

if __name__ == "__main__":
    asyncio.run(main())
