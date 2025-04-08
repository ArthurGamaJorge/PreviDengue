import os
import cv2
import numpy as np
import shutil
import random

# === VARIÁVEIS DE CAMINHO ===
CAMINHO_IMAGENS_ORIGINAIS = "/Users/u23135/Documents/TCC/tcc/data/images"
CAMINHO_LABELS_ORIGINAIS = "/Users/u23135/Documents/TCC/tcc/data/annotations"
CAMINHO_DATASET_FINAL = "/Users/u23135/Documents/TCC/tcc/data/splited_dataset"

# === CRIA AS PASTAS DE DESTINO ===
paths = {
    "train/images": os.path.join(CAMINHO_DATASET_FINAL, "train", "images"),
    "train/labels": os.path.join(CAMINHO_DATASET_FINAL, "train", "labels"),
    "val/images": os.path.join(CAMINHO_DATASET_FINAL, "val", "images"),
    "val/labels": os.path.join(CAMINHO_DATASET_FINAL, "val", "labels"),
}
for path in paths.values():
    os.makedirs(path, exist_ok=True)

# === AUGMENTATION ===
def load_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Erro ao carregar: {image_path}")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def save_augmented(image, label_path, nome_base, sufixo, destino_tipo):
    nome_img = f"{nome_base}_{sufixo}.jpg"
    nome_label = f"{nome_base}_{sufixo}.txt"

    caminho_img = os.path.join(paths[f"{destino_tipo}/images"], nome_img)
    caminho_label = os.path.join(paths[f"{destino_tipo}/labels"], nome_label)

    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    cv2.imwrite(caminho_img, image_bgr)
    shutil.copyfile(label_path, caminho_label)

def change_brightness_contrast(image, brightness=30, contrast=30):
    img = np.int16(image)
    img = img * (contrast / 127 + 1) - contrast + brightness
    img = np.clip(img, 0, 255)
    return np.uint8(img)

def blur_image(image, ksize=5):
    return cv2.GaussianBlur(image, (ksize, ksize), 0)

def add_noise(image, intensity=10):
    noise = np.random.randint(0, intensity, image.shape, dtype='uint8')
    return cv2.add(image, noise)

def histogram_equalization(image):
    img_yuv = cv2.cvtColor(image, cv2.COLOR_RGB2YUV)
    img_yuv[:, :, 0] = cv2.equalizeHist(img_yuv[:, :, 0])
    return cv2.cvtColor(img_yuv, cv2.COLOR_YUV2RGB)

def increase_saturation(image, factor=1.5):
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[:, :, 1] *= factor
    hsv = np.clip(hsv, 0, 255).astype(np.uint8)
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)

def apply_augmentations(image):
    return {
        "original": image,
        "bright": change_brightness_contrast(image, 40, 40),
        "dark": change_brightness_contrast(image, -40, 40),
        "noise": add_noise(image, intensity=10),
        "equalized": histogram_equalization(image),
        "saturated": increase_saturation(image, factor=1.7),
    }

# === EXECUÇÃO DO PROCESSAMENTO E DIVISÃO ===
def processar_e_dividir(porc_teste=0.2):
    imagens = [f for f in os.listdir(CAMINHO_IMAGENS_ORIGINAIS) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    imagens.sort()
    random.seed(42)
    random.shuffle(imagens)

    qtd_teste = int(len(imagens) * porc_teste)
    imagens_teste = set(imagens[:qtd_teste])

    for nome_img in imagens:
        nome_base, _ = os.path.splitext(nome_img)
        caminho_img = os.path.join(CAMINHO_IMAGENS_ORIGINAIS, nome_img)
        caminho_label = os.path.join(CAMINHO_LABELS_ORIGINAIS, nome_base + ".txt")

        if not os.path.exists(caminho_label):
            print(f"⚠️ Label não encontrada para: {nome_img}, pulando...")
            continue

        try:
            destino = "val" if nome_img in imagens_teste else "train"
            imagem = load_image(caminho_img)
            augmentadas = apply_augmentations(imagem)

            for sufixo, img_aug in augmentadas.items():
                save_augmented(img_aug, caminho_label, nome_base, sufixo, destino)

        except Exception as e:
            print(f"❌ Erro ao processar {nome_img}: {e}")

    print("✅ Processamento e divisão finalizados!")

# === LIMPAR PASTAS ===
def limpar_pastas():
    for path in paths.values():
        for arquivo in os.listdir(path):
            if arquivo != ".gitkeep":
                os.remove(os.path.join(path, arquivo))
    print("🧹 Pastas limpas com sucesso!")

# === INÍCIO ===
if __name__ == "__main__":
    opcao = int(input("Limpar (0) ou Criar e Dividir (1): "))
    if opcao == 0:
        limpar_pastas()
    elif opcao == 1:
        processar_e_dividir()
