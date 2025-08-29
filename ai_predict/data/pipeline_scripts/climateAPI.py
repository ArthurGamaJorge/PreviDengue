import asyncio
import json
import pandas as pd
from datetime import date, datetime
from epiweeks import Week
import logging
import httpx
import aiofiles
import aiofiles.os
from pathlib import Path

# --- CAMINHOS ROBUSTOS ---
SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_FILE = SCRIPT_DIR / "../municipios/municipios.json"
OUTPUT_FILE = SCRIPT_DIR / "../dadosClimaticos.parquet"

# --- Constantes ---
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
    last_week_str = df_mun["ano_semana"].max()
    year, week = map(int, last_week_str.split('/'))
    return Week(year, week)

async def fetch_data(client, rate_limiter, lat, lon, start_date, end_date):
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": ",".join(PARAMETERS), "community": "AG",
        "longitude": lon, "latitude": lat, "start": start_date,
        "end": end_date, "format": "JSON"
    }
    for attempt in range(MAX_RETRIES):
        await rate_limiter.wait()
        try:
            response = await client.get(url, params=params, timeout=30)
            if response.status_code == 200:
                return response.json().get("properties", {}).get("parameter", {})
            elif response.status_code == 429:
                logging.warning("API limitada, a aguardar 60s...")
                await asyncio.sleep(60)
            else:
                logging.warning(f"HTTP {response.status_code} na tentativa {attempt+1}")
        except (httpx.RequestError, asyncio.TimeoutError) as e:
            logging.error(f"Erro de pedido na tentativa {attempt+1}: {e}")
        await asyncio.sleep(2 ** attempt)
    return None

def api_data_to_df(name, ibge_code, data):
    records = []
    dates = data.get(PARAMETERS[0], {}).keys()
    for date_str in dates:
        date_obj = datetime.strptime(date_str, "%Y%m%d")
        epi_week = Week.fromdate(date_obj)
        year_week = f"{epi_week.year}/{epi_week.week:02d}"
        row = {"codigo_ibge": ibge_code, "municipio": name, "ano_semana": year_week}
        for param in PARAMETERS:
            row[param] = data.get(param, {}).get(date_str)
        records.append(row)
    df = pd.DataFrame(records)
    if not df.empty:
        df = df.astype({"codigo_ibge": "int32", "T2M": "float32", "T2M_MAX": "float32", "T2M_MIN": "float32", "PRECTOTCORR": "float32", "RH2M": "float32", "ALLSKY_SFC_SW_DWN": "float32"})
    return df

def aggregate_weekly(df):
    if df.empty: return df
    return df.groupby(["codigo_ibge", "municipio", "ano_semana"]).agg({
        "T2M": "mean", "T2M_MAX": "mean", "T2M_MIN": "mean", "RH2M": "mean",
        "ALLSKY_SFC_SW_DWN": "mean", "PRECTOTCORR": "sum"
    }).reset_index()

async def process_municipio(municipio, client, rate_limiter, semaphore, idx, total, df_existing):
    async with semaphore:
        codigo_ibge = municipio["codigo_ibge"]
        name = municipio["nome"]
        last_week = get_last_week_for_municipio(df_existing, codigo_ibge)
        start_week = Week(2014, 1) if last_week is None else last_week + 1
        
        if start_week > UPDATE_UNTIL_WEEK:
            logging.info(f"[{idx}/{total}] {name} já está atualizado. A saltar.")
            return None 

        start_date_str = start_week.startdate().strftime("%Y%m%d")
        end_date_str = UPDATE_UNTIL_WEEK.enddate().strftime("%Y%m%d")

        logging.info(f"[{idx}/{total}] A obter dados para {name} (semanas {start_week} a {UPDATE_UNTIL_WEEK})")
        data = await fetch_data(client, rate_limiter, municipio["latitude"], municipio["longitude"], start_date_str, end_date_str)

        if data:
            df_new = api_data_to_df(name, codigo_ibge, data)
            df_weekly = aggregate_weekly(df_new)
            logging.info(f"[{idx}/{total}] {name} atualizado com sucesso.")
            return df_weekly 
        else:
            logging.warning(f"[{idx}/{total}] Falha ao obter dados para {name}")
            return None

async def main():
    try:
        async with aiofiles.open(INPUT_FILE, "r", encoding="utf-8-sig") as f:
            municipios = json.loads(await f.read())
    except Exception as e:
        logging.error(f"Não foi possível ler o ficheiro de municípios: {e}")
        return

    unique = {m["codigo_ibge"]: m for m in municipios}
    municipios = list(unique.values())

    df_existing = pd.DataFrame()
    if await aiofiles.os.path.exists(OUTPUT_FILE):
        try:
            df_existing = pd.read_parquet(OUTPUT_FILE, engine='fastparquet')
        except Exception as e:
            logging.error(f"Não foi possível ler o ficheiro de dados climáticos existente: {e}")
            
    rate_limiter = RateLimiter(MAX_REQUESTS_PER_MINUTE)
    semaphore = asyncio.Semaphore(CONCURRENT_TASKS)
    
    async with httpx.AsyncClient() as client:
        tasks = [process_municipio(m, client, rate_limiter, semaphore, i+1, len(municipios), df_existing) for i, m in enumerate(municipios)]
        results = await asyncio.gather(*tasks)

    new_data_frames = [df for df in results if df is not None and not df.empty]
    
    if not new_data_frames:
        logging.info("Nenhum dado novo para adicionar. O ficheiro não foi modificado.")
    else:
        logging.info(f"A processar dados de {len(new_data_frames)} municípios.")
        df_new_data = pd.concat(new_data_frames, ignore_index=True)
        
        df_combined = pd.concat([df_existing, df_new_data], ignore_index=True)
        
        df_combined.drop_duplicates(subset=['codigo_ibge', 'ano_semana'], keep='last', inplace=True)
        
        df_combined = df_combined.sort_values(by=["codigo_ibge", "ano_semana"])
        
        logging.info(f"A salvar o ficheiro Parquet atualizado em {OUTPUT_FILE}...")
        df_combined.to_parquet(OUTPUT_FILE, index=False, engine='fastparquet')
        logging.info("Ficheiro Parquet salvo com sucesso.")

    logging.info("✅ Recolha de dados climáticos concluída.")

if __name__ == "__main__":
    asyncio.run(main())
