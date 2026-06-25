"""
Willay — Cloud Functions 2nd gen (Python 3.11)
Región: southamerica-east1
Proyecto: willay-tas

Estructura:
  main.py           ← entry point (este archivo)
  push.py           ← helper Expo Push API
  classifier/
    rules.py        ← clasificador local (Etapa A)
  tests/
    test_classifier.py

Variables de entorno requeridas (functions/.env o gcloud secrets):
  GEMINI_API_KEY   ← google-generativeai (opcional; sin esto, fallback rule-only)
"""
from __future__ import annotations

import datetime
import json
import logging
import os
from typing import Any

import pygeohash
from firebase_admin import firestore as fs
from firebase_admin import initialize_app, storage
from firebase_functions import firestore_fn, https_fn, options, scheduler_fn

from classifier.rules import classify_text as classify_rules
from face_embed_remote import face_embed
from push import send_expo_push

logger = logging.getLogger(__name__)

initialize_app()

REGION = options.SupportedRegion.SOUTHAMERICA_EAST1

# ──────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ──────────────────────────────────────────────────────────────────────────────

@https_fn.on_call(region=REGION)
def panic_echo(req: https_fn.CallableRequest) -> dict:
    """Calienta la función antes de la demo."""
    return {
        "ok": True,
        "warm": True,
        "ts": datetime.datetime.utcnow().isoformat() + "Z",
    }


# ──────────────────────────────────────────────────────────────────────────────
# REPORTS — trigger on_report_create
# ──────────────────────────────────────────────────────────────────────────────

@firestore_fn.on_document_created(
    document="reports/{reportId}",
    region=REGION,
)
def on_report_create(event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None]) -> None:
    """Disparado al crear un reporte. Rutea a panic o text."""
    snap = event.data
    if snap is None:
        return

    data = snap.to_dict() or {}
    report_type = data.get("type")
    report_id = event.params["reportId"]

    if report_type == "panic":
        _handle_panic(report_id, data)
    elif report_type == "text":
        _handle_text_report(report_id, data)
    else:
        logger.warning("on_report_create: tipo desconocido '%s' en %s", report_type, report_id)


def _handle_panic(report_id: str, data: dict) -> None:
    db = fs.client()
    db.collection("reports").document(report_id).update({
        "priority": "P1",
        "priorityReason": "panic:default_P1",
    })
    geohash = data.get("geohash", "")
    author_uid = data.get("authorUid", "")
    _fanout_panic(geohash, report_id, author_uid)
    logger.info("Panic P1 set — reportId=%s geohash=%s", report_id, geohash)


def _handle_text_report(report_id: str, data: dict) -> None:
    db = fs.client()
    text = data.get("text", "")
    result = classify_rules(text)

    if result["confidence"] >= 0.8:
        db.collection("reports").document(report_id).update({
            "priority": result["priority"],
            "priorityReason": result["reason"],
        })
        logger.info("Report %s → %s via rules (%s)", report_id, result["priority"], result["reason"])
    else:
        _classify_with_gemini(db, report_id, text)


# ──────────────────────────────────────────────────────────────────────────────
# GEMINI (Etapa B del clasificador)
# ──────────────────────────────────────────────────────────────────────────────

def _classify_with_gemini(db, report_id: str, text: str) -> None:
    """
    Fallback Gemini cuando reglas no resuelven (confidence < 0.8).
    Prompt definido en crafting/06-ml-pipeline.md.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        # Sin key: degradamos a P3 explícito. La demo sigue funcionando.
        db.collection("reports").document(report_id).update({
            "priority": "P3",
            "priorityReason": "gemini:no_api_key",
        })
        logger.warning("Report %s → P3 (no hay GEMINI_API_KEY)", report_id)
        return

    try:
        import google.generativeai as genai  # import lazy: solo si hay key

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = (
            "Eres un clasificador de emergencias ciudadanas en Lima, Perú.\n"
            "Recibirás un reporte breve (≤280 chars) de un vecino.\n"
            'Devuelve UN JSON con esta forma exacta:\n'
            '{"priority":"P1|P2|P3","label":"<una etiqueta corta>"}\n\n'
            "Criterios:\n"
            "- P1: vida en riesgo inmediato (armas, niños en peligro, secuestro, herida grave).\n"
            "- P2: delito en curso o reciente sin riesgo vital inmediato (robos, agresiones físicas).\n"
            "- P3: sospecha, observación, daño menor, información ambigua.\n\n"
            f'Reporte:\n"""{text}"""'
        )
        resp = model.generate_content(prompt, request_options={"timeout": 4})
        raw = (resp.text or "").strip()
        # El modelo a veces envuelve en ```json … ```; lo limpiamos.
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        priority = parsed.get("priority", "P3")
        if priority not in ("P1", "P2", "P3"):
            raise ValueError(f"priority inválido: {priority}")
        label = parsed.get("label", "unknown")
        db.collection("reports").document(report_id).update({
            "priority": priority,
            "priorityReason": f"gemini:{label}",
        })
        logger.info("Report %s → %s via gemini (%s)", report_id, priority, label)
    except Exception as e:  # noqa: BLE001
        logger.warning("Report %s — gemini falló: %s", report_id, e)
        db.collection("reports").document(report_id).update({
            "priority": "P3",
            "priorityReason": "gemini:parse_error" if isinstance(e, (ValueError, json.JSONDecodeError)) else "gemini:exception",
        })


# ──────────────────────────────────────────────────────────────────────────────
# FAN-OUT PANIC — Expo Push (sustituye a FCM topics — ver ADR-009)
# ──────────────────────────────────────────────────────────────────────────────

def _neighbor_geohashes(geohash: str) -> list[str]:
    """
    Geohash propio + 8 vecinos (4 cardinales + 4 diagonales).

    pygeohash.get_adjacent solo acepta 'top'|'bottom'|'left'|'right'.
    Las diagonales se obtienen como dos pasos cardinales consecutivos:
      top_left  = adjacent(adjacent(g, 'top'), 'left')
      top_right = adjacent(adjacent(g, 'top'), 'right')
      ... etc.
    """
    if not geohash:
        return []
    out = [geohash]
    cardinals = {"top": None, "bottom": None, "left": None, "right": None}
    for d in cardinals:
        try:
            adj = pygeohash.get_adjacent(geohash, d)
            if adj:
                out.append(adj)
                cardinals[d] = adj
        except Exception:  # noqa: BLE001
            continue
    # Diagonales: encadenar dos cardinales
    for v_dir in ("top", "bottom"):
        v_adj = cardinals.get(v_dir)
        if not v_adj:
            continue
        for h_dir in ("left", "right"):
            try:
                diag = pygeohash.get_adjacent(v_adj, h_dir)
                if diag:
                    out.append(diag)
            except Exception:  # noqa: BLE001
                continue
    return out


def _fanout_panic(geohash: str, report_id: str, author_uid: str) -> None:
    """
    Busca usuarios en el geohash propio + 8 vecinos y les envía push.
    No envía al autor del pánico (evita auto-ping).
    """
    if not geohash:
        logger.warning("_fanout_panic: sin geohash, skip")
        return
    db = fs.client()
    hashes = _neighbor_geohashes(geohash)
    tokens: list[str] = []

    # Firestore "in" admite hasta 10 elementos — perfecto para nuestros 9.
    query = db.collection("users").where("geohash", "in", hashes)
    for doc in query.stream():
        d = doc.to_dict() or {}
        if doc.id == author_uid:
            continue
        for t in d.get("expoPushTokens", []) or []:
            tokens.append(t)

    if not tokens:
        logger.info("fanout_panic: sin tokens en %s (vecinos incl.)", geohash)
        return

    sent = send_expo_push(
        tokens,
        title="🚨 Alerta P1 cerca de ti",
        body="Un vecino activó el botón de pánico en tu zona.",
        data={"kind": "nearby_p1", "reportId": report_id},
    )
    logger.info("fanout_panic: %d pushes enviados (reportId=%s)", sent, report_id)


# ──────────────────────────────────────────────────────────────────────────────
# SIGHTINGS — trigger on_sighting_create
# ──────────────────────────────────────────────────────────────────────────────

@firestore_fn.on_document_created(document="sightings/{sightingId}", region=REGION)
def on_sighting_create(event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None]) -> None:
    """
    Si el cliente reportó un match facial, notifica al registrante de la ficha.
    """
    snap = event.data
    if snap is None:
        return

    data = snap.to_dict() or {}
    matched_id = data.get("matchedMissingId")
    if not matched_id:
        return  # sin match; cleanup borrará la foto en 24h

    db = fs.client()
    ficha = db.collection("missing_persons").document(matched_id).get()
    if not ficha.exists:
        logger.warning("sighting %s: ficha %s no existe", event.params["sightingId"], matched_id)
        return
    ficha_data = ficha.to_dict() or {}
    registrant_uid = ficha_data.get("registrantUid")
    if not registrant_uid:
        return

    # 1. Notificación persistente.
    db.collection("notifications").add({
        "recipientUid": registrant_uid,
        "kind": "missing_match",
        "payload": {
            "missingPersonId": matched_id,
            "sightingId": event.params["sightingId"],
            "similarity": data.get("similarity"),
            "geohash": data.get("geohash"),
        },
        "readAt": None,
        "createdAt": fs.SERVER_TIMESTAMP,
    })

    # 2. Push al registrante.
    user_snap = db.collection("users").document(registrant_uid).get()
    user_data = user_snap.to_dict() or {}
    tokens = user_data.get("expoPushTokens", []) or []
    send_expo_push(
        tokens,
        title="Posible avistamiento",
        body=f"Hubo una posible coincidencia con la ficha de {ficha_data.get('name', '—')}.",
        data={"kind": "missing_match", "missingPersonId": matched_id},
    )
    logger.info("sighting match notificado a uid=%s", registrant_uid)


# ──────────────────────────────────────────────────────────────────────────────
# CLEANUP — sightings sin match > 24h
# ──────────────────────────────────────────────────────────────────────────────

@scheduler_fn.on_schedule(schedule="every 1 hours", region=REGION, timezone="America/Lima")
def cleanup_sightings(event: scheduler_fn.ScheduledEvent) -> None:
    """Borra sightings sin match con más de 24h + sus fotos en Storage."""
    db = fs.client()
    bucket = storage.bucket()
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=24)

    query = (
        db.collection("sightings")
        .where("matchedMissingId", "==", None)
        .where("createdAt", "<", cutoff)
        .limit(200)
    )
    deleted = 0
    for snap in query.stream():
        try:
            blob = bucket.blob(f"sightings/{snap.id}.jpg")
            if blob.exists():
                blob.delete()
            snap.reference.delete()
            deleted += 1
        except Exception as e:  # noqa: BLE001
            logger.warning("cleanup_sightings: error en %s: %s", snap.id, e)
    logger.info("cleanup_sightings: %d docs borrados", deleted)


# ──────────────────────────────────────────────────────────────────────────────
# OPERATOR — mark_report_status (callable)
# ──────────────────────────────────────────────────────────────────────────────

_VALID_TRANSITIONS: dict[str, set[str]] = {
    "received": {"attending", "dismissed"},
    "attending": {"closed", "dismissed"},
}

@https_fn.on_call(region=REGION)
def mark_report_status(req: https_fn.CallableRequest) -> dict:
    """Operador cambia estado de un reporte. Valida rol + transiciones."""
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Auth requerida.",
        )

    uid = req.auth.uid
    data = req.data or {}
    report_id = data.get("reportId")
    new_status = data.get("status")

    if not report_id or new_status not in {"attending", "closed", "dismissed"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="reportId y status válidos requeridos.",
        )

    db = fs.client()
    user_snap = db.collection("users").document(uid).get()
    if not user_snap.exists or (user_snap.to_dict() or {}).get("role") != "operator":
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo operadores pueden cambiar estado.",
        )

    report_ref = db.collection("reports").document(report_id)
    report_snap = report_ref.get()
    if not report_snap.exists:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="Reporte no existe.",
        )
    current = (report_snap.to_dict() or {}).get("status", "received")
    if new_status not in _VALID_TRANSITIONS.get(current, set()):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message=f"Transición inválida {current} → {new_status}.",
        )

    report_ref.update({
        "status": new_status,
        "attendedBy": uid if new_status == "attending" else (report_snap.to_dict() or {}).get("attendedBy"),
        "updatedAt": fs.SERVER_TIMESTAMP,
    })

    # Notificar al ciudadano del cambio de estado.
    author_uid = (report_snap.to_dict() or {}).get("authorUid")
    if author_uid:
        author_snap = db.collection("users").document(author_uid).get()
        tokens = ((author_snap.to_dict() or {}).get("expoPushTokens") or []) if author_snap.exists else []
        db.collection("notifications").add({
            "recipientUid": author_uid,
            "kind": "report_status",
            "payload": {"reportId": report_id, "status": new_status},
            "readAt": None,
            "createdAt": fs.SERVER_TIMESTAMP,
        })
        send_expo_push(
            tokens,
            title="Willay — Tu reporte fue atendido" if new_status == "attending" else "Willay — Reporte cerrado" if new_status == "closed" else "Willay — Reporte actualizado",
            body="El Serenazgo está atendiendo tu reporte. Mantente atento." if new_status == "attending" else "Tu reporte ha sido cerrado por el Serenazgo." if new_status == "closed" else "Tu reporte ha sido actualizado.",
            data={"kind": "report_status", "reportId": report_id, "status": new_status},
        )

    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# CLASSIFY TEXT (callable público — útil para testing manual)
# ──────────────────────────────────────────────────────────────────────────────

@https_fn.on_call(region=REGION)
def classify_text(req: https_fn.CallableRequest) -> dict:
    """Permite probar el clasificador sin crear un report. Solo para debug/demo."""
    text = (req.data or {}).get("text", "")
    if not text or len(text) > 280:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="text requerido (≤280).",
        )
    res = classify_rules(text)
    if res["confidence"] >= 0.8:
        return {"priority": res["priority"], "reason": res["reason"], "usedGemini": False}
    # Llamamos a Gemini pero NO escribimos en Firestore (es una utilidad pura).
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {"priority": "P3", "reason": "gemini:no_api_key", "usedGemini": False}
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            'Devuelve UN JSON {"priority":"P1|P2|P3","label":"<corto>"} para:\n'
            f'"""{text}"""'
        )
        raw = (model.generate_content(prompt, request_options={"timeout": 4}).text or "").strip().strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        parsed = json.loads(raw)
        return {"priority": parsed.get("priority", "P3"), "reason": f"gemini:{parsed.get('label', '?')}", "usedGemini": True}
    except Exception as e:  # noqa: BLE001
        logger.warning("classify_text_callable gemini error: %s", e)
        return {"priority": "P3", "reason": "gemini:error", "usedGemini": True}




# ──────────────────────────────────────────────────────────────────────────────
# RESUMEN IA — summarize_user_reports (callable)
# Cuando un vecino tiene 3+ reportes activos, Gemini los resume
# para el operador en un mensaje conciso.
# ──────────────────────────────────────────────────────────────────────────────

@https_fn.on_call(region=REGION)
def summarize_user_reports(req: https_fn.CallableRequest) -> dict:
    """
    Recibe un authorUid y devuelve un resumen IA de sus reportes activos.
    Solo accesible por operadores.
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Auth requerida.",
        )

    uid = req.auth.uid
    data = req.data or {}
    author_uid = data.get("authorUid")

    if not author_uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="authorUid requerido.",
        )

    db = fs.client()

    # Verificar que el solicitante es operador
    user_snap = db.collection("users").document(uid).get()
    if not user_snap.exists or (user_snap.to_dict() or {}).get("role") != "operator":
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo operadores pueden solicitar resúmenes.",
        )

    # Obtener reportes activos del vecino (últimas 24h)
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    reports_query = (
        db.collection("reports")
        .where("authorUid", "==", author_uid)
        .where("status", "in", ["received", "attending"])
        .limit(10)
    )
    reports = [r.to_dict() for r in reports_query.stream()]

    if not reports:
        return {"summary": "Este vecino no tiene reportes activos.", "count": 0, "usedGemini": False}

    if len(reports) < 3:
        return {
            "summary": f"El vecino tiene {len(reports)} reporte(s) activo(s). No se requiere resumen.",
            "count": len(reports),
            "usedGemini": False,
        }

    # Construir texto para Gemini
    texts = []
    for i, r in enumerate(reports, 1):
        t = r.get("text", "")
        p = r.get("priority", "P3")
        kind = "Pánico" if r.get("type") == "panic" else r.get("incidentType", "otro")
        texts.append(f"{i}. [{p}] {kind}: {t or '(sin descripción)'}")

    reports_text = "\n".join(texts)

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {
            "summary": f"El vecino tiene {len(reports)} reportes activos. Configura GEMINI_API_KEY para resúmenes IA.",
            "count": len(reports),
            "usedGemini": False,
        }

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            "Eres un asistente de seguridad ciudadana. "
            "Un vecino ha enviado múltiples reportes. "
            "Resume en 2-3 oraciones concisas qué está pasando y si hay un patrón preocupante. "
            "Sé directo y profesional, sin rodeos.\n\n"
            f"Reportes del vecino:\n{reports_text}\n\n"
            "Responde SOLO el resumen, sin introducción ni títulos."
        )
        response = model.generate_content(prompt, request_options={"timeout": 6})
        summary = (response.text or "").strip()
        return {"summary": summary, "count": len(reports), "usedGemini": True}
    except Exception as e:
        logger.warning("summarize_user_reports gemini error: %s", e)
        return {
            "summary": f"El vecino tiene {len(reports)} reportes activos recientes. Revisar manualmente.",
            "count": len(reports),
            "usedGemini": False,
        }


# ──────────────────────────────────────────────────────────────────────────────
# BOT DE SEGURIDAD — chat_assistant (callable)
# El vecino le hace preguntas al bot sobre qué hacer en situaciones de peligro
# ──────────────────────────────────────────────────────────────────────────────

@https_fn.on_call(region=REGION)
def chat_assistant(req: https_fn.CallableRequest) -> dict:
    """
    Bot de seguridad ciudadana para Puente Piedra.
    Responde preguntas del vecino sobre qué hacer en situaciones de emergencia.
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Auth requerida.",
        )

    data = req.data or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []  # lista de {role, content}

    if not message:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Mensaje requerido.",
        )

    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return {
            "reply": "El asistente no está disponible en este momento. Llama al Serenazgo: (01) 219-6220.",
            "usedGemini": False,
        }

    try:
        import urllib.request, json as _json

        messages_payload = [
            {"role": "system", "content": (
                "Eres WillayBot, el asistente de seguridad ciudadana del distrito de Puente Piedra, Lima, Peru. "
                "Tu funcion es ayudar a los vecinos en situaciones de emergencia. "
                "Responde SIEMPRE en espanol, de forma clara y concisa (maximo 3-4 oraciones). "
                "Da consejos practicos. En emergencias recomienda: Serenazgo (01)219-6220, Policia 105, Bomberos 116. "
                "Se empatico pero directo."
            )},
        ]
        for msg in history[-6:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages_payload.append({"role": role, "content": msg.get("content", "")})
        messages_payload.append({"role": "user", "content": message})

        body = _json.dumps({
            "model": "llama-3.1-8b-instant",
            "messages": messages_payload,
            "max_tokens": 300,
            "temperature": 0.7,
        }).encode()

        req_obj = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST"
        )
        with urllib.request.urlopen(req_obj, timeout=10) as r:
            data = _json.loads(r.read())
        reply = data["choices"][0]["message"]["content"].strip()
        return {"reply": reply, "usedGemini": True}

    except Exception as e:
        logger.warning("chat_assistant error: %s", e)
        return {
            "reply": "Lo siento, no puedo responder ahora. Para emergencias llama al Serenazgo: (01) 219-6220 o usa el boton de panico.",
            "usedGemini": False,
        }