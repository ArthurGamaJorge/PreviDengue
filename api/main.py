#   vicorn main:app --reload

from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
def read_root():
    return {"message": "Hello!"}


def receiveImage():
    pass


def detectObjects():
    pass


def sendImage():
    pass



'''
from fastapi import FastAPI
from fastapi.responses import FileResponse
import os

app = FastAPI()

@app.get("/ver-imagem")
def ver_imagem():
    caminho = os.path.abspath("../data/images/img-0.png")
    return FileResponse(caminho, media_type="image/png")

'''


'''
from fastapi import UploadFile, File

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    contents = await file.read()
    with open(f"uploads/{file.filename}", "wb") as f:
        f.write(contents)
    return {"filename": file.filename}

'''