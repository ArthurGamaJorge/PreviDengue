import streamlit as st
from PIL import Image
from ultralytics import YOLO
from collections import Counter
import tempfile
import cv2
import numpy as np

st.set_page_config(page_title="Simulador de Detecção por Drone", layout="wide")
st.title("Singularidade")

model_path = "./model/best2.pt"
model = YOLO(model_path)
names = model.names

cores_por_classe = {
    "carro": (155, 0, 0),
    "piscina": (0, 0, 155),
    "caixa_agua": (0, 155, 0)
}

imagens = st.file_uploader("Envie imagens do drone", type=["png", "jpg", "jpeg"], accept_multiple_files=True)
conf_min = st.slider("Confiabilidade mínima", 0.0, 1.0, 0.5, 0.01)
somente_caixa = st.checkbox("Somente caixa (sem texto)")

if imagens:
    total_contagem = Counter()
    for imagem in imagens:
        img = Image.open(imagem).convert("RGB")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp:
            img.save(temp.name)
            results = model(temp.name)

        boxes = results[0].boxes
        class_ids = boxes.cls.tolist()
        confidences = boxes.conf.tolist()
        coords = boxes.xyxy.tolist()
        filtrados = [(cls, conf, coord) for cls, conf, coord in zip(class_ids, confidences, coords) if conf >= conf_min]
        class_names = [names[int(cls)] for cls, _, _ in filtrados]
        counts = Counter(class_names)
        total_contagem.update(class_names)

        image_np = np.array(img)
        for cls, conf, (x1, y1, x2, y2) in filtrados:
            label = names[int(cls)].lower()
            color = cores_por_classe.get(label, (255, 255, 255))
            x1, y1, x2, y2 = map(int, (x1, y1, x2, y2))
            cv2.rectangle(image_np, (x1, y1), (x2, y2), color, 2)
            if not somente_caixa:
                text = f"{label} {conf:.2f}"
                (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
                cv2.rectangle(image_np, (x1, y1 - th - 4), (x1 + tw, y1), color, -1)
                cv2.putText(image_np, text, (x1, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        with st.container():
            st.markdown("### Imagem processada")
            col1, col2 = st.columns(2)
            with col1:
                st.image(img, caption="📷 Original", use_container_width=True, channels="RGB")
            with col2:
                st.image(image_np, caption="✅ Detecção", use_container_width=True, channels="RGB")

    st.markdown("---")
    st.subheader("📊 Estatísticas totais de detecção")
    st.markdown(f"**Total de objetos detectados**: {sum(total_contagem.values())}")
    for cls, count in total_contagem.items():
        st.markdown(f"- **{cls.capitalize()}**: {count}")
