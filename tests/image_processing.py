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

def rotate_image(image, angle):
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, matrix, (w, h))

def invert_colors(image):
    return cv2.bitwise_not(image)

def add_noise(image):
    noise = np.random.randint(0, 50, image.shape, dtype='uint8')
    return cv2.add(image, noise)

def blur_image(image, ksize=5):
    return cv2.GaussianBlur(image, (ksize, ksize), 0)

def flip_image(image, mode=1):
    return cv2.flip(image, mode)

def change_brightness(image, factor=1.5):
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * factor, 0, 255)
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)

def show_maximized(image, title="Imagem Maximizada"):
    plt.figure(figsize=(10, 10))
    plt.imshow(image)
    plt.title(title)
    plt.axis("off")
    plt.show()

def on_click(event, image):
    if event.button == 1:
        show_maximized(image)

def decolorize(image):
    return cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

def edge_enhanced(image):
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    return cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)

def salient_edge_map(image):
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    _, thresholded = cv2.threshold(edges, 127, 255, cv2.THRESH_BINARY)
    return cv2.cvtColor(thresholded, cv2.COLOR_GRAY2RGB)



def apply_augmentations(image):
    augmentations = {
        "Original": image,
        "Rotacionado": rotate_image(image, 30),
        "Inversão de Cores": invert_colors(image),
        "Com Ruído": add_noise(image),
        "Borrado": blur_image(image),
        "Espelhado": flip_image(image),
        "Brilho Ajustado": change_brightness(image, 1.3),
        "decolorize": decolorize(image),
        "edge": edge_enhanced(image),
        "saliend": salient_edge_map(image)
    }
    return augmentations

def main():
    image_folder = "../data/images"
    image_files = [f for f in os.listdir(image_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]
    
    if not image_files:
        print("Nenhuma imagem encontrada na pasta.")
        return
    
    image_path = os.path.join(image_folder, image_files[4])
    image = load_image(image_path)
    
    augmentations = apply_augmentations(image)
    num_images = len(augmentations)
    cols = 3
    rows = (num_images + cols - 1) // cols
    
    fig, axes = plt.subplots(rows, cols, figsize=(12, 8))
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