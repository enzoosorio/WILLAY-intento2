from __future__ import annotations

from typing import Any

from firebase_functions import https_fn, options

from face_model import embed_face

REGION = options.SupportedRegion.SOUTHAMERICA_EAST1


@https_fn.on_call(region=REGION)
def face_embed(req: https_fn.CallableRequest) -> dict:
    data = req.data or {}
    image_base64 = data.get("imageBase64")
    if not image_base64:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="imageBase64 requerido",
        )

    embedding = embed_face(image_base64)
    return {
        "embedding": embedding,
        "dim": len(embedding),
        "model": "w600k_mbf",
        "backend": "onnx-remote",
    }
