import uvicorn
from fastapi import Body, FastAPI, UploadFile, File, Response 
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback
import numpy as np 
import json 

from detect import DengueDetector
from predict import DenguePredictor  

def default_json_serializer(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

detector: DengueDetector = None
predictor: DenguePredictor = None

app = FastAPI()

# --- Crie um evento de startup para carregar os modelos ---
@app.on_event("startup")
async def startup_event():
    global detector, predictor
    print("Executando evento de startup: Carregando os módulos de IA...")
    detector = DengueDetector()
    predictor = DenguePredictor()
    print("Módulos de IA carregados com sucesso. API pronta.")

# --- CORS ---
origins = ["https://previdengue.vercel.app", "http://localhost:3000", "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# --- Rotas ---
@app.get("/")
def health_check():
    return {"status": "ok", "message": "API de Dengue rodando!"}

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    if detector is None:
        return JSONResponse(status_code=503, content={"error": "Detector ainda não foi inicializado."})
    try:
        content = await file.read()
        result = detector.detect_image(content)  
        return JSONResponse(content=result)
    except Exception as e:
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
            "traceback": tb_str 
        })