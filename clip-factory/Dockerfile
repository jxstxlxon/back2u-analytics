FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=10000 BACK2U_DATA=/tmp/back2u_data
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY clip-factory/payload/ /tmp/back2u-payload/
RUN cat /tmp/back2u-payload/part00.b64 /tmp/back2u-payload/part01.b64 | base64 -d | tar -xz -C /app && python -m py_compile /app/app.py /app/clipfactory.py && rm -rf /tmp/back2u-payload
RUN pip install --no-cache-dir -r /app/requirements.txt
EXPOSE 10000
CMD ["python", "app.py"]
