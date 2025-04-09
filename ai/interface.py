import streamlit as st
import random
from PIL import Image, ImageDraw

st.set_page_config(page_title="Simulador de Detecção por Drone", layout="wide")

st.title("Singularidade")

# Upload da imagem
imagem = st.file_uploader("Envie uma imagem do drone", type=["png", "jpg", "jpeg"])

if imagem:
    img_original = Image.open(imagem).convert("RGB")

    # Simula imagem com detecção (desenha caixas aleatórias)
    img_detectada = img_original.copy()
    draw = ImageDraw.Draw(img_detectada)
    for _ in range(random.randint(2, 5)):
        x1 = random.randint(0, img_detectada.width // 2)
        y1 = random.randint(0, img_detectada.height // 2)
        x2 = x1 + random.randint(50, 150)
        y2 = y1 + random.randint(50, 150)
        conf = round(random.uniform(50, 99), 1)
        label = random.choice(["Carro", "Piscina", "Caixa d'água"])
        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        draw.text((x1 + 5, y1 + 5), f"{label} {conf}%", fill="white")

    st.markdown("### Imagens")
    col1, col2 = st.columns(2)
    with col1:
        st.image(img_original, caption="📷 Imagem Original", use_container_width=True)
    with col2:
        st.image(img_detectada, caption="✅ Imagem com Detecção Simulada", use_container_width=True)

    st.markdown("---")
    st.subheader("📊 Estatísticas simuladas de detecção")

    def gerar_estatisticas():
        return sorted([round(random.uniform(30, 100), 1) for _ in range(random.randint(1, 4))], reverse=True)

    objetos = {
        "Carros": gerar_estatisticas(),
        "Piscinas": gerar_estatisticas(),
        "Caixas d'água": gerar_estatisticas()
    }

    for nome, confiancas in objetos.items():
        st.markdown(f"**{nome}**: " + ", ".join([f"{c}%" for c in confiancas]))
