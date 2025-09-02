FROM python:3.13.3

RUN useradd -m -u 1000 user

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1

USER user
ENV PATH="/home/user/.local/bin:$PATH"

COPY . /app

WORKDIR /app

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user . /app
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]