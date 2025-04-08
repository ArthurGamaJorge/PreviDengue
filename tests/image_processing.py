import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
import random

def load_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Não foi possível carregar a imagem.")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def change_brightness_contrast(image, brightness=30, contrast=30):
    img = np.int16(image)
    img = img * (contrast / 127 + 1) - contrast + brightness
    img = np.clip(img, 0, 255)
    return np.uint8(img)

def blur_image(image, ksize=5):
    return cv2.GaussianBlur(image, (ksize, ksize), 0)

def add_noise(image, intensity=10):
    noise = np.random.randint(0, intensity, image.shape, dtype='uint8')
    noisy_image = cv2.add(image, noise)
    return noisy_image

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
    augmentations = {
        "Original": image,
        "Brilho Alto/Contraste": change_brightness_contrast(image, 40, 40),
        "Brilho Baixo/Contraste": change_brightness_contrast(image, -40, 40),
        "Desfocado": blur_image(image, 7),
        "Com Pouco Ruído": add_noise(image, intensity=10),
        "Equalização de Histograma": histogram_equalization(image),
        "Mais Saturado": increase_saturation(image, factor=1.7)
    }
    return augmentations

def main():
    image_folder = "../data/images"
    image_files = [f for f in os.listdir(image_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]

    if not image_files:
        print("Nenhuma imagem encontrada na pasta.")
        return

    image_path = os.path.join(image_folder, image_files[1])
    image = load_image(image_path)

    augmentations = apply_augmentations(image)
    num_images = len(augmentations)
    cols = 3
    rows = (num_images + cols - 1) // cols

    fig, axes = plt.subplots(rows, cols, figsize=(15, 10))
    axes = axes.flatten()

    for ax, (title, img) in zip(axes, augmentations.items()):
        ax.imshow(img)
        ax.set_title(title)
        ax.axis("off")

    for ax in axes[num_images:]:
        ax.axis("off")

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    main()

