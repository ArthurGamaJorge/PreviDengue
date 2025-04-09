#   vicorn main:app --reload

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
import os

app = FastAPI()

@app.get("/hello")
def read_root():
    return {"message": "Hello!"}

@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    with open("received.png", "wb") as f:
        f.write(contents)

    # Abrir imagem, inverter e salvar
    img = Image.open("received.png")
    inverted_img = ImageOps.invert(img.convert("RGB"))
    inverted_img.save("inverted.png")

    return JSONResponse(content={"message": "Imagem invertida com sucesso!"})
