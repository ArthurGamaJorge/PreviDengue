from ultralytics import YOLO
import cv2
from matplotlib import pyplot as plt
from collections import Counter

model_path = "./model/best2.pt"
model = YOLO(model_path)

image_path = "../data/images/img-76.png"

results = model(image_path)

results[0].show()

boxes = results[0].boxes
class_ids = boxes.cls.tolist()

names = model.names
class_names = [names[int(cls)] for cls in class_ids]

counts = Counter(class_names)

print(f"🔍 Total de objetos detectados: {len(class_ids)}")
for cls, count in counts.items():
    print(f" - {cls}: {count}")
