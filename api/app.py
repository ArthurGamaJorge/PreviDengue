# uvicorn app:app --reload

from fastapi import Body, FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from detect import DengueDetector
from predict import DenguePredictor
import traceback

# Inicializar detector e preditor
detector = DengueDetector()
predictor = DenguePredictor()

app = FastAPI()

# --- CORS ---
origins = ["https://previdengue.vercel.app", "*"]
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

# --- Rota de detecção ---
@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    try:
        content = await file.read()
        result = detector.detect_image(content)  
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# --- Rota de predição com lazy loading de scalers ---
@app.post("/predict/")
async def predict_dengue_route(payload: dict = Body(...)):
    try:
        ibge_code = payload.get("ibge_code")
        weeks_to_predict = payload.get("weeks_to_predict")
        if ibge_code is None or weeks_to_predict is None:
            raise ValueError("ibge_code e weeks_to_predict são obrigatórios.")

        result = predictor.predict(ibge_code, weeks_to_predict)
        return result

    except Exception as e:
        tb_str = traceback.format_exc()
        print(tb_str) 
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "traceback": tb_str 
        })