"""
Helper de Expo Push API.

Decisión: ADR-009 originalmente era FCM topics geohash. Se cambió a Expo Push
porque `@react-native-firebase/messaging` requiere dev build (rompe Expo Go).
Expo Push API funciona en Expo Go y mantiene la UX equivalente.

Endpoint: https://docs.expo.dev/push-notifications/sending-notifications/

El servicio acepta hasta 100 mensajes por request. Lo respetamos con chunks.
"""
from __future__ import annotations

import logging
from typing import Any, Iterable

import requests

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
CHUNK = 100


def send_expo_push(
    tokens: Iterable[str],
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> int:
    """
    Envía un push idéntico a todos los tokens. Devuelve cuántos mensajes se
    intentaron enviar (no implica que todos llegaron; Expo responde con
    tickets que requieren verificación posterior, no implementada para MVP).
    """
    tokens = [t for t in tokens if t and t.startswith("ExponentPushToken")]
    if not tokens:
        logger.info("send_expo_push: sin tokens válidos")
        return 0

    total = 0
    for chunk in _chunked(tokens, CHUNK):
        messages = [
            {
                "to": t,
                "title": title,
                "body": body,
                "sound": "default",
                "priority": "high",
                "data": data or {},
            }
            for t in chunk
        ]
        try:
            r = requests.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=10,
            )
            r.raise_for_status()
            total += len(messages)
            logger.info("expo push: %d mensajes enviados", len(messages))
        except Exception as e:  # noqa: BLE001
            logger.warning("expo push falló para chunk de %d: %s", len(messages), e)
    return total


def _chunked(items: list[str], size: int) -> Iterable[list[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]
