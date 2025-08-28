import time
import subprocess
import sys
import shutil
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

DESTINATION_DIR = Path(__file__).resolve().parent.parent / "casos"
NEW_FILENAME = "mun2025.csv"
DATASUS_URL = "http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sinannet/cnv/denguebbr.def/csv/"

def download_datasus_file_selenium():
    print("--- 1. Iniciando download via automação de navegador (Selenium) ---")
    
    DESTINATION_DIR.mkdir(parents=True, exist_ok=True)

    chrome_options = webdriver.ChromeOptions()
    prefs = {"download.default_directory": str(DESTINATION_DIR)}
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
        
        wait = WebDriverWait(driver, 30)

        select_linha = Select(wait.until(EC.element_to_be_clickable((By.NAME, "Linha"))))
        select_linha.select_by_value("Município_infecção")
        print("Selecionou 'Município infecção' na Linha.")

        select_coluna = Select(wait.until(EC.element_to_be_clickable((By.NAME, "Coluna"))))
        select_coluna.select_by_value("Semana_epidem._1º_Sintomas(s)")
        print("Selecionou 'Semana epidem. 1º Sintomas(s)' na Coluna.")
        
        botao_mostra = wait.until(EC.element_to_be_clickable((By.NAME, "mostre")))
        botao_mostra.click()
        print("Clicou em 'Mostra'. A gerar a tabela de resultados...")

        if len(driver.window_handles) > 1:
            driver.switch_to.window(driver.window_handles[-1])
            print("Mudou para a nova janela da tabela.")

        print("A procurar o botão de download do CSV...")
        
        # ✅ CORREÇÃO 1: Lógica mais robusta para encontrar o ficheiro baixado
        # Guarda a lista de ficheiros CSV existentes ANTES de clicar no download.
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
            
            # Compara a lista atual de ficheiros com a lista antiga para encontrar o novo.
            csvs_depois_do_download = set(DESTINATION_DIR.glob("*.csv"))
            novos_ficheiros = csvs_depois_do_download - csvs_antes_do_download
            
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
        try:
            driver.save_screenshot(str(screenshot_path))
            print(f"Captura de ecrã do erro salva em: {screenshot_path}")
        except Exception as screenshot_error:
            print(f"Não foi possível tirar a captura de ecrã: {screenshot_error}")
        raise
    finally:
        driver.quit()

def run_script(script_name):
    print(f"\n--- Executando o script: {script_name} ---")
    
    python_executable = sys.executable
    
    process = subprocess.Popen(
        [python_executable, "-u", script_name],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )

    for line in iter(process.stdout.readline, b''):
        print(line.decode('utf-8'), end='', flush=True)

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
        # ✅ CORREÇÃO 2: Procura pela pasta temporária do Chrome no diretório de execução atual (CWD).
        # Esta é a localização mais comum onde o Selenium a cria.
        for item in Path.cwd().glob(".com.google.Chrome*"):
            if item.is_dir():
                print(f"Encontrada pasta temporária: '{item.name}'. A remover...")
                shutil.rmtree(item, ignore_errors=True)
                print(f"Pasta '{item.name}' removida.")
        
        run_script("climateAPI.py")
        
        run_script("joinData.py")
        
        print("\n====== PIPELINE CONCLUÍDO COM SUCESSO! ======")

    except Exception as e:
        print(f"\n###### ERRO FATAL NO PIPELINE. O processo foi interrompido. ######")

if __name__ == "__main__":
    main()
