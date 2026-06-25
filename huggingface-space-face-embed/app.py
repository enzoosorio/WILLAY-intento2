from __future__ import annotations

import base64
import io
import os
from pathlib import Path
from urllib.request import urlopen

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

MODEL_URL = os.environ.get(
    "FACE_MODEL_URL",
    "https://github.com/enzoosorio/WILLAY-intento2/releases/download/version/w600k_mbf.onnx",
)
MODEL_PATH = Path("/tmp/w600k_mbf.onnx")
INPUT_SIZE = 112

app = FastAPI(title="Willay Face Embedder", version="1.0.0")
_session = None


class EmbedRequest(BaseModel):
    imageBase64: str
    mimeType: str | None = "image/jpeg"
    client: str | None = None


class EmbedResponse(BaseModel):
    embedding: list[float]
    dim: int
    model: str
    backend: str


def ensure_model_file() -> str:
    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 0:
        return str(MODEL_PATH)
    with urlopen(MODEL_URL) as response:
        MODEL_PATH.write_bytes(response.read())
    return str(MODEL_PATH)


def get_session():
    global _session
    if _session is None:
        model_path = ensure_model_file()
        _session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    return _session


def preprocess(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.asarray(image).astype(np.float32)
    arr = (arr - 127.5) / 127.5
    arr = np.transpose(arr, (2, 0, 1))
    return np.expand_dims(arr, axis=0)


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "willay-face-embedder",
        "endpoint": "/embed",
    }


@app.post("/embed", response_model=EmbedResponse)
def embed_face(payload: EmbedRequest):
    try:
        image_bytes = base64.b64decode(payload.imageBase64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_tensor = preprocess(image)

        session = get_session()
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: input_tensor})
        embedding = np.asarray(outputs[0]).reshape(-1)
        norm = np.linalg.norm(embedding) or 1.0
        embedding = (embedding / norm).astype(np.float32).tolist()

        return {
            "embedding": embedding,
            "dim": len(embedding),
            "model": "w600k_mbf",
            "backend": "huggingface-fastapi",
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
