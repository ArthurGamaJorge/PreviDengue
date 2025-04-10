
#     uvicorn main:app --reload


from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import os
import cv2
import numpy as np
from collections import Counter
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_path = "../ai/model/best2.pt"
model = YOLO(model_path)

@app.get("/hello")
def read_root():
    return {"message": "Hello!"}

@app.post("/detect/")
async def upload_image(file: UploadFile = File(...)):
    print("-" * 50)
    print("Detecting...")
    contents = await file.read()

    image_path = "received.png"
    with open(image_path, "wb") as f:
        f.write(contents)

    try:
        image = Image.open(image_path)
        width, height = image.size

        results = model(image_path)
        result = results[0]
        boxes = result.boxes
        names = model.names

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
                    "y2": y2,
                    "original_width": width,
                    "original_height": height
                }
            })

        return JSONResponse(content={
            "total": len(class_ids),
            "contagem": counts,
            "objetos": detections
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
