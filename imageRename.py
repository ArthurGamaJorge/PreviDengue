import os

def rename_images(folder_path):
    if not os.path.isdir(folder_path):
        print(f"Erro: O diretório '{folder_path}' não existe.")
        return
    
    images = [f for f in os.listdir(folder_path) if f.lower().endswith(('png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'))]
    images.sort()
    
    for index, image in enumerate(images):
        ext = os.path.splitext(image)[1]  # Obtém a extensão do arquivo
        new_name = f"image-{index}{ext}"
        old_path = os.path.join(folder_path, image)
        new_path = os.path.join(folder_path, new_name)
        
        try:
            os.rename(old_path, new_path)
            print(f"Renomeado: {image} -> {new_name}")
        except Exception as e:
            print(f"Erro ao renomear {image}: {e}")

# Caminho da pasta
directory = "/Users/u23578/Documents/tcc/data/images"
rename_images(directory)