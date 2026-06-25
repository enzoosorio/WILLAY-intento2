"""
Agrega métricas reales de la demo a partir de Firestore (T5.2).

Calcula lo que se puede derivar de los datos persistidos:
  - % de reportes de texto clasificados SIN llamar a Gemini (eficiencia híbrida).
  - Distribución de prioridades (P1/P2/P3).
  - Reparto por `priorityReason` (rules:* vs gemini:*).

Las latencias (pánico→push, facial on-device) se miden en runtime y se cargan a
mano en `crafting/metrics-final.md`; este script cubre la parte que vive en datos.

Uso:
    # Producción (service account):
    GOOGLE_APPLICATION_CREDENTIALS=willay-sa.json python tools/measure.py

    # Emulador:
    FIRESTORE_EMULATOR_HOST=localhost:8080 python tools/measure.py

Requisitos: pip install firebase-admin
"""
from __future__ import annotations

import os
import sys
from collections import Counter

import firebase_admin
from firebase_admin import credentials, firestore


def init() -> firestore.Client:
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        firebase_admin.initialize_app(
            options={"projectId": os.environ.get("GCLOUD_PROJECT", "willay-tas")}
        )
    else:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path:
            print("ERROR: setear GOOGLE_APPLICATION_CREDENTIALS o FIRESTORE_EMULATOR_HOST")
            sys.exit(2)
        firebase_admin.initialize_app(credentials.Certificate(cred_path))
    return firestore.client()


def main() -> None:
    db = init()

    text_reports = [
        d.to_dict()
        for d in db.collection("reports").where("type", "==", "text").stream()
    ]
    total = len(text_reports)
    if total == 0:
        print("No hay reportes de texto. Corre tools/seed_demo.py primero.")
        return

    reasons = Counter()
    priorities = Counter()
    used_gemini = 0
    for r in text_reports:
        reason = r.get("priorityReason", "unknown")
        reasons[reason] += 1
        priorities[r.get("priority", "?")] += 1
        if reason.startswith("gemini:"):
            used_gemini += 1

    rules_only = total - used_gemini
    pct_no_gemini = 100.0 * rules_only / total

    print("\n=== Métricas de triaje de texto ===")
    print(f"Total reportes de texto:           {total}")
    print(f"Resueltos por reglas (sin Gemini): {rules_only}")
    print(f"Enviados a Gemini:                 {used_gemini}")
    print(f"% clasificados SIN Gemini:         {pct_no_gemini:.1f}%  (objetivo ≥70%)")

    print("\nDistribución de prioridades:")
    for p in ("P1", "P2", "P3"):
        print(f"  {p}: {priorities.get(p, 0)}")

    print("\nReparto por priorityReason:")
    for reason, n in reasons.most_common():
        print(f"  {reason:28s} {n}")


if __name__ == "__main__":
    main()
