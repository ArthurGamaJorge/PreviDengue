from collections import Counter
import math
import numpy as np
from PIL import Image
from io import BytesIO
from ultralytics import YOLO

def _compute_iou(box_a, box_b):
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    area_a = max(0.0, (ax2 - ax1)) * max(0.0, (ay2 - ay1))
    area_b = max(0.0, (bx2 - bx1)) * max(0.0, (by2 - by1))
    union = area_a + area_b - inter_area
    return inter_area / union if union > 0 else 0.0

def _nms_xyxy(boxes, scores, iou_threshold=0.5):
    if len(boxes) == 0:
        return []
    idxs = np.argsort(scores)[::-1]
    keep = []
    while len(idxs) > 0:
        i = idxs[0]
        keep.append(i)
        if len(idxs) == 1:
            break
        rest = idxs[1:]
        ious = np.array([_compute_iou(boxes[i], boxes[j]) for j in rest])
        idxs = rest[ious <= iou_threshold]
    return keep

class DengueDetector:
    def __init__(self, model_path="./models/detect.pt"):
        self.model = YOLO(model_path)
        self.names = self.model.names
        
        self.tile_size = 1024
        self.default_overlap = 0.2 
        self.fast_max_side = 3072 
        self.batch_tiles = 8       
        try:
            if hasattr(self.model, "fuse"):
                self.model.fuse()
        except Exception:
            pass
        print("Modelo carregado com as seguintes classes:", self.names)

    def calculate_intensity(self, objects):
        if not objects:
            return 0.0
        
        weights = {
            "piscina_suja": 10.0,
            "reservatorio_de_agua": 8.0,
            "pneu": 6.0,
            "lona": 4.0,
            "monte_de_lixo": 3.0,
            "saco_de_lixo": 2.0,
            "piscina_limpa": 1.0
        }
        
        total_score = 0.0
        first_obj = objects[0]
        img_w = first_obj["box"]["original_width"]
        img_h = first_obj["box"]["original_height"]
        total_img_area = float(img_w * img_h)

        if total_img_area == 0:
            for obj in objects:
                weight = weights.get(obj["class"], 1.0) 
                confidence = obj["confidence"]
                total_score += weight * confidence
            return total_score

        for obj in objects:
            weight = weights.get(obj["class"], 1.0) 
            confidence = obj["confidence"]
            
            box = obj["box"]
            w = box["x2"] - box["x1"]
            h = box["y2"] - box["y1"]
            obj_area = w * h
            relative_area = obj_area / total_img_area
            
            # risco = Peso * Confiança * Área Relativa
            risk_contribution = weight * confidence * relative_area
            total_score += risk_contribution
        
        return total_score * 100.0

    def detect_image(self, image_bytes, fast: bool = True):
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        orig_width, orig_height = img.size

        scale = 1.0
        tile_size = self.tile_size
        overlap = self.default_overlap

        if fast:
            max_side = max(orig_width, orig_height)
            if max_side > self.fast_max_side:
                scale = self.fast_max_side / float(max_side)
                new_w = max(1, int(round(orig_width * scale)))
                new_h = max(1, int(round(orig_height * scale)))
                img_resized = img.resize((new_w, new_h), resample=Image.BILINEAR)
            else:
                img_resized = img
        else:
            img_resized = img

        img_np = np.array(img_resized)
        height, width = img_np.shape[:2]

        stride = max(1, int(tile_size * (1 - overlap))) 

        def compute_starts(total, size, stride):
            starts = list(range(0, max(total - size, 0) + 1, stride))
            if len(starts) == 0:
                starts = [0]
            last = max(total - size, 0)
            if starts[-1] != last:
                starts.append(last)
            return starts

        x_starts = compute_starts(width, tile_size, stride)
        y_starts = compute_starts(height, tile_size, stride)

        tiles = []
        origins = [] 
        for y0 in y_starts:
            for x0 in x_starts:
                x1 = x0
                y1 = y0
                x2 = min(x0 + tile_size, width)
                y2 = min(y0 + tile_size, height)
                tile = img_np[y1:y2, x1:x2, :]
                if tile.size == 0:
                    continue
                tiles.append(tile)
                origins.append((x1, y1))

        all_boxes = []  
        all_scores = []
        all_classes = []

        if len(tiles) > 0:
            bs = max(1, int(self.batch_tiles))
            for i in range(0, len(tiles), bs):
                batch = tiles[i:i+bs]
                batch_origins = origins[i:i+bs]
                results = self.model(batch, verbose=False)
                for res, (ox, oy) in zip(results, batch_origins):
                    boxes = res.boxes
                    if boxes is None or len(boxes) == 0:
                        continue
                    class_ids = boxes.cls.tolist()
                    confidences = boxes.conf.tolist()
                    xyxy = boxes.xyxy.cpu().numpy() if hasattr(boxes.xyxy, 'cpu') else np.array(boxes.xyxy)

                    for j in range(len(class_ids)):
                        bx1, by1, bx2, by2 = map(float, xyxy[j])
                        all_boxes.append((bx1 + ox, by1 + oy, bx2 + ox, by2 + oy))
                        all_scores.append(float(confidences[j]))
                        all_classes.append(int(class_ids[j]))

        final_boxes = []
        final_scores = []
        final_classes = []
        all_boxes_np = np.array(all_boxes, dtype=float)
        all_scores_np = np.array(all_scores, dtype=float)
        all_classes_np = np.array(all_classes, dtype=int)

        for cls in set(all_classes_np.tolist()) if len(all_classes_np) else []:
            cls_mask = (all_classes_np == cls)
            boxes_cls = all_boxes_np[cls_mask]
            scores_cls = all_scores_np[cls_mask]
            keep = _nms_xyxy(boxes_cls, scores_cls, iou_threshold=0.5)
            for k in keep:
                final_boxes.append(tuple(boxes_cls[k]))
                final_scores.append(float(scores_cls[k]))
                final_classes.append(int(cls))

        detections = []
        class_names = []
        for b, s, c in zip(final_boxes, final_scores, final_classes):
            x1, y1, x2, y2 = map(float, b)
            if scale != 1.0:
                inv = 1.0 / scale
                x1 *= inv
                y1 *= inv
                x2 *= inv
                y2 *= inv
            cname = self.names[int(c)]

            if cname == "lona" and s < 0.6:
                continue

            class_names.append(cname)
            detections.append({
                "class": cname,
                "confidence": round(s, 4),
                "box": {
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "original_width": orig_width, "original_height": orig_height
                }
            })

        counts = Counter(class_names)
        intensity_score = self.calculate_intensity(detections)

        return {
            "total": len(detections),
            "contagem": counts,
            "objetos": detections,
            "intensity_score": intensity_score
        }