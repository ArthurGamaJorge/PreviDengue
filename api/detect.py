from collections import Counter
import numpy as np
from PIL import Image
from io import BytesIO
from ultralytics import YOLO

class DengueDetector:
    def __init__(self, model_path="./models/DetectsmallTest1.pt"):
        self.model = YOLO(model_path)
        self.names = self.model.names

    def calculate_intensity(self, objects):
        weights = {"piscina": 9, "caixa_agua": 4, "carro": 1}
        score = sum(weights.get(obj["class"], 0) for obj in objects)
        return score

    def detect_image(self, image_bytes):
        # Carregar imagem da memória
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img)  # YOLO aceita np.array diretamente
        height, width = img_np.shape[:2]

        # Detectar objetos
        results = self.model(img_np)
        result = results[0]
        boxes = result.boxes
        class_ids = boxes.cls.tolist()
        confidences = boxes.conf.tolist()
        class_names = [self.names[int(cls)] for cls in class_ids]
        counts = Counter(class_names)

        # Construir lista de detecções
        detections = []
        for i in range(len(boxes)):
            x1, y1, x2, y2 = map(float, boxes.xyxy[i])
            conf = float(confidences[i])
            cls_id = int(class_ids[i])
            detections.append({
                "class": self.names[cls_id],
                "confidence": round(conf, 4),
                "box": {
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "original_width": width, "original_height": height
                }
            })

        intensity_score = self.calculate_intensity(detections)

        return {
            "total": len(class_ids),
            "contagem": counts,
            "objetos": detections,
            "intensity_score": intensity_score
        }
