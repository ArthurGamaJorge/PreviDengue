# train.py
import os
import random
import shutil
import yaml
from pathlib import Path

import torch
from ultralytics import YOLO

# === Configurações ===
NUM_IMAGENS = 50           # Quantidade de imagens para usar (subconjunto)
EPOCHS = 5               # Número de épocas de treino
IMAGE_SIZE = 416           # Tamanho da imagem (imgsz)
MODEL_PATH = 'yolov8n.pt'  # Modelo base


def prepare_dataset(image_dir, label_dir, output_dir, train_ratio=0.8):
    images = sorted([f for f in os.listdir(image_dir) if f.endswith(('.png', '.jpg'))])
    random.shuffle(images)

    images = images[:NUM_IMAGENS]  # Limita a quantidade de imagens

    split_idx = int(len(images) * train_ratio)
    train_images = images[:split_idx]
    val_images = images[split_idx:]

    for subset, img_list in zip(['train', 'val'], [train_images, val_images]):
        img_path = os.path.join(output_dir, subset, 'images')
        lbl_path = os.path.join(output_dir, subset, 'labels')
        os.makedirs(img_path, exist_ok=True)
        os.makedirs(lbl_path, exist_ok=True)

        for img_file in img_list:
            base = os.path.splitext(img_file)[0]
            shutil.copy(os.path.join(image_dir, img_file), os.path.join(img_path, img_file))

            txt_path = os.path.join(label_dir, base + '.txt')
            if os.path.exists(txt_path):
                shutil.copy(txt_path, os.path.join(lbl_path, base + '.txt'))
            else:
                print(f"[AVISO] Anotação não encontrada para {img_file}, pulando...")


def create_yaml(output_dir, yaml_path):
    abs_path = os.path.abspath(output_dir)
    data = {
        'path': abs_path,
        'train': 'train/images',
        'val': 'val/images',
        'names': ['piscina', 'caixa_dagua', 'carro']
    }
    with open(yaml_path, 'w') as f:
        yaml.dump(data, f)


def train_yolo(data_yaml, model_path=MODEL_PATH, epochs=EPOCHS):
    model = YOLO(model_path)
    model.train(data=data_yaml, epochs=epochs, imgsz=IMAGE_SIZE)
    
    os.makedirs('runs/train', exist_ok=True)  # Garante que o diretório existe
    model.save('runs/train/model.pt')


def main():
    image_dir = '../data/images'
    label_dir = '../data/annotations'
    output_dir = 'dataset_yolo'
    yaml_path = 'yolo_data.yaml'

    prepare_dataset(image_dir, label_dir, output_dir)
    create_yaml(output_dir, yaml_path)
    train_yolo(yaml_path)


if __name__ == '__main__':
    main()

