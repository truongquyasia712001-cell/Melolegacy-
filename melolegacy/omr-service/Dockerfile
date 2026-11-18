FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OMR_DATA_DIR=/data \
    AUDIVERIS_BIN=/opt/audiveris/bin/Audiveris

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl ghostscript python3 python3-venv fonts-dejavu-core \
    libasound2t64 libfontconfig1 libfreetype6 libgtk-3-0t64 libxrender1 libxtst6 \
    && rm -rf /var/lib/apt/lists/*

ARG AUDIVERIS_VERSION=5.11.0
ARG AUDIVERIS_DEB=Audiveris-5.11.0-ubuntu24.04-x86_64.deb
RUN curl -fL "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/${AUDIVERIS_DEB}" -o /tmp/audiveris.deb \
    && dpkg-deb -x /tmp/audiveris.deb / \
    && rm -f /tmp/audiveris.deb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY app ./app
RUN mkdir -p /data && useradd --system --uid 10001 --create-home omr \
    && chown -R omr:omr /data /app
USER omr

ENV PATH="/opt/venv/bin:${PATH}"
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
