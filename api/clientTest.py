import requests

with open("img.png", "rb") as img_file:
    response = requests.post(
        "http://localhost:8000/upload/",
        files={"file": ("img.png", img_file, "image/png")}
    )

print(response.json())
