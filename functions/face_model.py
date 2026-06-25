from __future__ import annotations

import base64
import io
import os
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.request import urlopen

import numpy as np
from PIL import Image

try:
    import onnxruntime as ort
except Exception:  # pragma: no cover
    ort = None

MODEL_URL = os.environ.get(
    "FACE_MODEL_URL",
    "https://github.com/enzoosorio/WILLAY-intento2/releases/download/version/w600k_mbf.onnx",
)
MODEL_PATH = Path("/tmp/w600k_mbf.onnx")
INPUT_SIZE = 112


def _ensure_model_file() -> str:
    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 0:
        return str(MODEL_PATH)

    with urlopen(MODEL_URL) as response:
                MODEL_PATH.write_bytes(response.read())
    return str(MODEL_PATH)


@lru_cache(maxsize=1)
def _session() -> Any:
    if ort is None:
        raise RuntimeError("onnxruntime no está disponible en el backend")
    session_path = _ensure_model_file()
    return ort.InferenceSession(session_path, providers=["CPUExecutionProvider"])


def _decode_image(image_base64: str) -> Image.Image:
    raw = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(raw)).convert("RGB")
    if image.size != (INPUT_SIZE, INPUT_SIZE):
    image = image.resize((INPUT_SIZE, INPUT_SIZE))
    return image


def _preprocess(image: Image.Image) -> np.ndarray:
    arr = np.asarray(image).astype(np.float32)
    arr = (arr - 127.5) / 127.5
    arr = np.transpose(arr, (2, 0, 1))
    return np.expand_dims(arr, axis=0)


def embed_face(image_base64: str) -> list[float]:
    session = _session()
    image = _decode_image(image_base64)
    input_array = _preprocess(image)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_array})
    embedding = np.asarray(outputs[0]).reshape(-1)
    norm = np.linalg.norm(embedding) or 1.0
    return (embedding / norm).astype(np.float32).tolist()
