# Hafif bir Python imajı
FROM python:3.11-slim

# Sistem paketleri (scipy / numpy için derleme araçları)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Çalışma dizini
WORKDIR /app

# Gereksinimleri kopyala ve kur
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Proje dosyalarını kopyala
COPY . .

# Varsayılan komut (interaktif olarak konsoldan rating alacak)
CMD ["python", "main.py"]
