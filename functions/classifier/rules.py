"""
Clasificador híbrido — Etapa A: reglas locales.
Referencia: crafting/06-ml-pipeline.md § Pipeline 1 Etapa A.

Si confidence < 0.8 en el resultado, el caller debe invocar Gemini (Etapa B).
"""
from __future__ import annotations

import re
import unicodedata
from typing import TypedDict


class ClassifyResult(TypedDict):
    priority: str       # "P1" | "P2" | "P3"
    reason: str         # "rules:<keyword>" | "rules:low_signal" | "rules:low_confidence"
    confidence: float   # 0.0 – 1.0
    used_gemini: bool


# Diccionario de keywords por prioridad (precisión alta → baja).
# Tupla: (priority, keywords, confidence)
_RULES: list[tuple[str, list[str], float]] = [
    (
        "P1",
        [
            "arma", "pistola", "cuchillo", "disparo", "disparos", "balacera",
            "nino", "nina", "bebe", "secuestro", "rapto", "desaparecido",
        ],
        0.95,
    ),
    (
        "P2",
        [
            "golpe", "golpes", "agresion", "pelea", "sangre",
            "robo", "asalto", "arrebato", "me roban",
        ],
        0.90,
    ),
    (
        "P3",
        [
            "sospechoso", "merodea", "merodeando", "extrano",
        ],
        0.80,
    ),
]


def _normalize(text: str) -> str:
    """Lowercase + elimina tildes para comparación robusta."""
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def classify_text(text: str) -> ClassifyResult:
    """
    Clasifica un reporte corto de texto según reglas locales.

    Returns:
        ClassifyResult con priority, reason, confidence y used_gemini=False.
        Si confidence < 0.8, el caller debe llamar a Gemini como fallback.
    """
    stripped = (text or "").strip()

    # Señal muy baja: texto vacío o demasiado corto
    if len(stripped) < 10:
        return ClassifyResult(
            priority="P3",
            reason="rules:low_signal",
            confidence=0.99,
            used_gemini=False,
        )

    normalized = _normalize(stripped)
    best_priority: str | None = None
    best_keyword: str | None = None
    best_confidence: float = 0.0

    for priority, keywords, confidence in _RULES:
        for kw in keywords:
            # Búsqueda por palabra completa; "arma" no debe matchear "farmacia"
            pattern = r"\b" + re.escape(_normalize(kw)) + r"\b"
            if re.search(pattern, normalized):
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_priority = priority
                    best_keyword = kw

    if best_priority and best_confidence >= 0.8:
        return ClassifyResult(
            priority=best_priority,
            reason=f"rules:keyword={best_keyword}",
            confidence=best_confidence,
            used_gemini=False,
        )

    # Sin match claro → zona gris, el caller debe usar Gemini
    return ClassifyResult(
        priority="P3",
        reason="rules:low_confidence",
        confidence=0.4,
        used_gemini=False,
    )
