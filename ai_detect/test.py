import os
import cv2
import numpy as np
import matplotlib.pyplot as plt

IMAGE_PATH = "./t.png"

def load_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Erro ao carregar: {image_path}")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def change_brightness_contrast(image, brightness=30, contrast=30):
    img = np.int16(image)
    img = img * (contrast / 127 + 1) - contrast + brightness
    img = np.clip(img, 0, 255)
    return np.uint8(img)

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

if __name__ == "__main__":
    image = load_image(IMAGE_PATH)
    augmented = apply_augmentations(image)

    fig, axes = plt.subplots(2, 3, figsize=(12, 8))
    for ax, (name, img) in zip(axes.flat, augmented.items()):
        ax.imshow(img)
        ax.set_title(name, pad=1, fontsize=9)  # título com pouco espaço
        ax.axis("off")

    plt.subplots_adjust(hspace=0, wspace=0.05, top=0.92, bottom=0.05)
    plt.show()
