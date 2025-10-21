# uvicorn app:app --reload
import os
import uvicorn
from fastapi import Body, FastAPI, UploadFile, File, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback
import numpy as np
import json

from detect import DengueDetector
from municipal_predictor import DenguePredictor
from state_predictor import StatePredictor


def default_json_serializer(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


detector: DengueDetector | None = None
predictor: DenguePredictor | None = None
state_predictor: StatePredictor | None = None

# Se api irá utilizar datasets baixados do hugging face ou os locais
ONLINE: bool = True

app = FastAPI()


@app.on_event("startup")
async def startup_event():
    global detector, predictor, state_predictor
    print("Executando evento de startup: Carregando os módulos de IA...")

    offline_flag = (not ONLINE)
    local_city_inf = None
    local_state_inf = None

    detector = DengueDetector()
    try:
        predictor = DenguePredictor(
            offline=offline_flag,
            local_inference_path=local_city_inf,
        )
    except Exception as e:
        print("[WARN] DenguePredictor (municipal) não inicializado:", str(e))
        predictor = None
    try:
        state_predictor = StatePredictor(
            offline=offline_flag,
            local_inference_path=local_state_inf,
        )
    except Exception as e:
        print("[WARN] StatePredictor não inicializado:", str(e))
        state_predictor = None
    print("Módulos de IA carregados com sucesso. API pronta. Modo:", "online" if ONLINE else "offline")


# --- CORS ---
origins = ["https://previdengue.vercel.app", "http://localhost:3000", "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "message": "API de Dengue rodando!",
        "mode": "online" if ONLINE else "offline",
        "online": ONLINE,
    }


@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    if detector is None:
        return JSONResponse(status_code=503, content={"error": "Detector ainda não foi inicializado."})
    try:
        content = await file.read()
        result = detector.detect_image(content)
        return JSONResponse(content=result)
    except Exception as e:
        tb_str = traceback.format_exc()
        print(tb_str)
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/predict/")
async def predict_dengue_route(payload: dict = Body(...)):
    if predictor is None:
        return JSONResponse(status_code=503, content={"error": "Preditor ainda não foi inicializado."})
    try:
        ibge_code_str = payload.get("ibge_code")
        if ibge_code_str is None:
            raise ValueError("O campo 'ibge_code' é obrigatório.")

        ibge_code = int(ibge_code_str)
        result = predictor.predict(ibge_code)

        json_content = json.dumps(result, default=default_json_serializer)

        return Response(content=json_content, media_type="application/json")

    except Exception as e:
        tb_str = traceback.format_exc()
        print(tb_str)
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "traceback": tb_str,
        })


@app.post("/predict/state/")
async def predict_dengue_state_route(payload: dict = Body(...)):
    global state_predictor
    if state_predictor is None:
        try:
            local_state_inf = None
            state_predictor = StatePredictor(
                offline=(not ONLINE),
                local_inference_path=local_state_inf,
            )
        except Exception as e:
            return JSONResponse(status_code=503, content={"error": f"Preditor estadual ainda não foi inicializado: {str(e)}"})
    try:
        state_sigla = payload.get("state") or payload.get("state_sigla") or payload.get("uf")
        year = payload.get("year")
        week = payload.get("week")
        if not state_sigla:
            raise ValueError("O campo 'state' (sigla) é obrigatório.")

        result = state_predictor.predict(
            str(state_sigla).upper(),
            year=int(year) if year is not None else None,
            week=int(week) if week is not None else None,
        )

        json_content = json.dumps(result, default=default_json_serializer)
        return Response(content=json_content, media_type="application/json")

    except Exception as e:
        tb_str = traceback.format_exc()
        print(tb_str)
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "traceback": tb_str,
        })