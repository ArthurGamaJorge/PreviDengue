# uvicorn main:app --reload --port 8001

import os
import uuid
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from tensorflow.keras.models import load_model

# --- Configurações da API FastAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configurações e Carregamento do Modelo de Detecção (do seu código original) ---
detect_model_path = "./models/DetectsmallTest1.pt"
try:
    detect_model = YOLO(detect_model_path)
    print("Modelo de detecção YOLO carregado com sucesso.")
except Exception as e:
    print(f"Erro ao carregar o modelo YOLO: {e}. O endpoint /detect/ pode não funcionar.")
    detect_model = None

# --- Funções do seu código original ---
def caculateIntensity(objetos):
    count_piscina = sum(1 for o in objetos if o["class"] == "piscina")
    count_caixa = sum(1 for o in objetos if o["class"] == "caixa_agua")
    count_carro = sum(1 for o in objetos if o["class"] == "carro")

    w_piscina = 9
    w_caixa = 4
    w_carro = 1

    score = count_piscina * w_piscina + count_caixa * w_caixa + count_carro * w_carro
    return score

# --- Endpoint de Detecção (do seu código original) ---
@app.post("/detect/")
async def upload_image(file: UploadFile = File(...)):
    if detect_model is None:
        raise HTTPException(status_code=500, detail="O modelo de detecção não foi carregado.")

    print("-" * 50)
    print("Detecting...")

    image_uuid = str(uuid.uuid4())
    image_path = f"{image_uuid}.png"

    try:
        contents = await file.read()
        with open(image_path, "wb") as f:
            f.write(contents)

        results = detect_model(image_path)
        result = results[0]
        boxes = result.boxes
        names = detect_model.names
        
        class_ids = boxes.cls.tolist()
        confidences = boxes.conf.tolist()
        class_names = [names[int(cls)] for cls in class_ids]
        counts = Counter(class_names)

        detections = []
        for i in range(len(boxes)):
            x1, y1, x2, y2 = map(float, boxes.xyxy[i])
            conf = float(confidences[i])
            cls_id = int(class_ids[i])
            detections.append({
                "class": names[cls_id],
                "confidence": round(conf, 4),
                "box": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                }
            })
        os.remove(image_path)

        intensity_score = caculateIntensity(detections)

        return JSONResponse(content={
            "total": len(class_ids),
            "contagem": counts,
            "objetos": detections,
            "intensity_score": intensity_score
        })

    except Exception as e:
        if os.path.exists(image_path):
            os.remove(image_path)
        raise HTTPException(status_code=500, detail=str(e))

# --- Configurações e Carregamento do Modelo de Previsão de Dengue ---
DENGUE_DATA_PATH = "../data/final_training_data.parquet"
DENGUE_MODEL_PATH = "./checkpoints/model_checkpoint_best.keras"
SCALER_DIR = "./scalers/"
SEQUENCE_LENGTH = 12

# Carrega o modelo e os dados globalmente para evitar recarregamento em cada requisição
try:
    print("Carregando modelo de previsão de dengue...")
    model = load_model(DENGUE_MODEL_PATH)
    df = pd.read_parquet(DENGUE_DATA_PATH)
    df['codigo_ibge'] = df['codigo_ibge'].astype(int)
    df = df.sort_values(by=['codigo_ibge', 'ano', 'semana'])
    print("Modelo de previsão de dengue e dados carregados com sucesso.")
except Exception as e:
    print(f"Erro ao carregar o modelo de dengue ou dados: {e}. O endpoint /dengue/predict/ pode não funcionar.")
    model = None
    df = None

# Features usadas no treinamento
dynamic_features = [
    "numero_casos", "T2M", "T2M_MAX", "T2M_MIN",
    "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"
]
static_features = ["latitude", "longitude"]

def inverse_transform_cases(scaler, data, feature_index=0):
    """
    Inverse transform the scaled target (numero_casos) using the given scaler.
    """
    dummy_data = np.zeros((len(data), scaler.n_features_in_))
    dummy_data[:, feature_index] = data
    return scaler.inverse_transform(dummy_data)[:, feature_index]

# --- NOVO ENDPOINT DE PREVISÃO DE DENGUE ---
@app.get("/dengue/predict/{municipio_code}/{weeks_ahead}/{weather_year}")
async def predict_dengue(municipio_code: int, weeks_ahead: int, weather_year: int):
    """
    Faz a previsão de casos de dengue para um município usando o modelo de IA.
    
    - municipio_code: Código IBGE do município.
    - weeks_ahead: Número de semanas futuras para prever.
    - weather_year: Ano de referência para os dados climáticos futuros.
    """
    if model is None or df is None:
        raise HTTPException(status_code=500, detail="Modelo de previsão ou dados não carregados.")

    # Validação de entradas
    if weeks_ahead < 1:
        raise HTTPException(status_code=400, detail="O número de semanas deve ser pelo menos 1.")

    if municipio_code not in df['codigo_ibge'].values:
        raise HTTPException(status_code=404, detail=f"Código IBGE {municipio_code} não encontrado.")

    # Filtra os dados do município selecionado
    df_mun = df[df['codigo_ibge'] == municipio_code].copy()

    # Carrega os scalers específicos do município
    scaler_dyn_path = os.path.join(SCALER_DIR, f"{municipio_code}_dynamic.pkl")
    scaler_static_path = os.path.join(SCALER_DIR, f"{municipio_code}_static.pkl")
    if not os.path.exists(scaler_dyn_path) or not os.path.exists(scaler_static_path):
        raise HTTPException(status_code=500, detail=f"Arquivos de scaler para o município {municipio_code} não encontrados.")
    
    scaler_dyn = joblib.load(scaler_dyn_path)
    scaler_static = joblib.load(scaler_static_path)

    dynamic_data = df_mun[dynamic_features].values
    static_data = df_mun[static_features].iloc[0].values.reshape(1, -1)
    static_scaled = scaler_static.transform(static_data)
    dynamic_scaled = scaler_dyn.transform(dynamic_data)

    # Obter dados climáticos do ano de referência
    df_ref_year = df[(df['codigo_ibge'] == municipio_code) & (df['ano'] == weather_year)].copy()
    if df_ref_year.empty:
        raise HTTPException(status_code=404, detail=f"Não há dados para o ano de referência do clima: {weather_year}")

    ref_weather_features = [f for f in dynamic_features if f != 'numero_casos']
    ref_weather_data = df_ref_year[ref_weather_features].values
    dummy_ref_data = np.zeros((len(ref_weather_data), len(dynamic_features)))
    dummy_ref_data[:, 1:] = ref_weather_data
    ref_weather_scaled = scaler_dyn.transform(dummy_ref_data)[:, 1:]

    # Loop de predição
    predictions_full = []
    last_sequence = dynamic_scaled[-SEQUENCE_LENGTH:]
    
    for i in range(weeks_ahead):
        input_seq = np.array([last_sequence])
        input_static = np.array([static_scaled[0]])
        next_cases_scaled = model.predict([input_seq, input_static], verbose=0).flatten()[0]
        
        predicted_cases = inverse_transform_cases(scaler_dyn, np.array([next_cases_scaled]))[0]
        # Garantir que a previsão não seja negativa
        predictions_full.append(max(0, predicted_cases))
        
        week_index = i % len(ref_weather_scaled)
        new_weather_scaled = ref_weather_scaled[week_index]
        
        new_row_scaled = np.concatenate(([next_cases_scaled], new_weather_scaled))
        last_sequence = np.append(last_sequence[1:], [new_row_scaled], axis=0)

    # Retorna as previsões em formato JSON
    return JSONResponse(content={
        "municipio_code": municipio_code,
        "weeks_ahead": weeks_ahead,
        "weather_reference_year": weather_year,
        "predictions": predictions_full
    })

