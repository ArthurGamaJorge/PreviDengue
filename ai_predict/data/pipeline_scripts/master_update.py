import time
import subprocess
import sys
import shutil
from pathlib import Path
from datetime import date
from epiweeks import Week
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os

target_week = Week.fromdate(date.today()) - 3
TARGET_YEAR = target_week.year

DESTINATION_DIR = Path("../casos")
NEW_FILENAME = f"mun{TARGET_YEAR}.csv"
DATASUS_URL = "http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sinannet/cnv/denguebbr.def/csv/"

def download_datasus_file_selenium():
    print("--- 1. Iniciando download via automação de navegador (Selenium) ---")
    
    DESTINATION_DIR.mkdir(parents=True, exist_ok=True)

    chrome_options = webdriver.ChromeOptions()
    prefs = {"download.default_directory": str(DESTINATION_DIR.resolve())}
    chrome_options.add_experimental_option("prefs", prefs)
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu") 
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        driver.get(DATASUS_URL)
        print(f"Navegando para: {DATASUS_URL}")
        
        wait = WebDriverWait(driver, 60)

        Select(wait.until(EC.element_to_be_clickable((By.NAME, "Linha")))).select_by_value("Município_infecção")
        print("Selecionou 'Município infecção' na Linha.")
        Select(wait.until(EC.element_to_be_clickable((By.NAME, "Coluna")))).select_by_value("Semana_epidem._1º_Sintomas(s)")
        print("Selecionou 'Semana epidem. 1º Sintomas(s)' na Coluna.")
        
        year_dropdown = Select(wait.until(EC.element_to_be_clickable((By.NAME, "Arquivos"))))
        year_dropdown.deselect_all()
        year_value_to_select = f"dengbr{str(TARGET_YEAR)[2:]}.dbf"
        year_dropdown.select_by_value(year_value_to_select)
        print(f"Selecionou dinamicamente o ano de {TARGET_YEAR}.")
        
        wait.until(EC.element_to_be_clickable((By.NAME, "mostre"))).click()
        print("Clicou em 'Mostra'. A gerar a tabela de resultados...")

        if len(driver.window_handles) > 1:
            driver.switch_to.window(driver.window_handles[-1])
            print("Mudou para a nova janela da tabela.")

        print("A procurar o botão de download do CSV...")
        csvs_antes_do_download = set(DESTINATION_DIR.glob("*.csv"))
        botao_csv_selector = (By.CSS_SELECTOR, "a[href*='.csv']")
        botao_csv = wait.until(EC.presence_of_element_located(botao_csv_selector))
        driver.execute_script("arguments[0].click();", botao_csv)
        print("Clicou em 'CSV' via JavaScript. A iniciar o download...")

        tempo_espera = 0
        ficheiro_final = None
        while tempo_espera < 180: 
            time.sleep(5)
            tempo_espera += 5
            novos_ficheiros = set(DESTINATION_DIR.glob("*.csv")) - csvs_antes_do_download
            ficheiros_completos = [f for f in novos_ficheiros if not f.name.endswith('.crdownload')]
            if ficheiros_completos:
                ficheiro_baixado = ficheiros_completos[0]
                print(f"Download concluído! Ficheiro temporário: {ficheiro_baixado.name}")
                
                destination_path = DESTINATION_DIR / NEW_FILENAME
                if destination_path.exists():
                    destination_path.unlink()
                ficheiro_baixado.rename(destination_path)
                print(f"Ficheiro renomeado para: {destination_path}")
                
                ficheiro_final = destination_path
                break 
        
        if not ficheiro_final:
            raise TimeoutError("O download do ficheiro demorou mais de 3 minutos.")

        return ficheiro_final

    except Exception as e:
        print(f"### ERRO durante a automação com Selenium: {e} ###")
        screenshot_path = DESTINATION_DIR / "error_screenshot.png"
        driver.save_screenshot(str(screenshot_path))
        print(f"Captura de ecrã do erro salva em: {screenshot_path}")
        raise
    finally:
        driver.quit()

def run_script(script_name):
    print(f"\n--- Executando o script: {script_name} ---")
    python_executable = sys.executable
    
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'

    process = subprocess.Popen(
        [python_executable, "-u", script_name],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace',
        bufsize=1
    )

    for line in iter(process.stdout.readline, ''):
        print(line, end='', flush=True)

    process.stdout.close()
    return_code = process.wait()

    if return_code:
        raise subprocess.CalledProcessError(return_code, script_name)
    
    print(f"--- {script_name} concluído com sucesso! ---")


def main():
    print("====== INICIANDO PIPELINE DE ATUALIZAÇÃO DE DADOS ======")
    try:
        download_datasus_file_selenium()
        
        print("Limpando ficheiros temporários...")
        for item in Path.cwd().glob(".com.google.Chrome*"):
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
                print(f"Pasta temporária '{item.name}' removida.")
        
        run_script("climateAPI.py")
        run_script("joinData.py")
        print("\n====== PIPELINE CONCLUÍDO COM SUCESSO! ======")
    except Exception as e:
        print(f"\n###### ERRO FATAL NO PIPELINE: {e}. O processo foi interrompido. ######")

if __name__ == "__main__":
    main()

