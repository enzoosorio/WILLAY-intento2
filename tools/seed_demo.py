"""
Seed de datos sintéticos para la demo (T5).

Crea:
  - 3 reportes de texto de ejemplo (uno por prioridad esperada tras el
    triaje de reglas).
  - 1 reporte panic.
  - 2 fichas de personas desaparecidas (sin foto real; embedding aleatorio).

Pensado para correr contra el EMULADOR:
    $env:FIRESTORE_EMULATOR_HOST="localhost:8080"
    python tools/seed_demo.py <uid-del-ciudadano-demo>

Pasarle el uid del usuario "ciudadano" para que sea el autor de los reportes
y fichas (sino las reglas rechazarían escrituras desde admin SDK... bueno,
admin SDK las omite, pero queremos que el feed sea coherente).
"""
from __future__ import annotations

import os
import random
import sys
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import firestore


def main() -> None:
    if len(sys.argv) != 2:
        print("Uso: python tools/seed_demo.py <uid>")
        sys.exit(1)
    uid = sys.argv[1].strip()
    if not os.environ.get("FIRESTORE_EMULATOR_HOST"):
        print("⚠  Sin FIRESTORE_EMULATOR_HOST — este script asume emulador.")
    firebase_admin.initialize_app(options={"projectId": os.environ.get("GCLOUD_PROJECT", "willay-tas")})
    db = firestore.client()

    now = datetime.now(timezone.utc)
    geohash = "6mc6cn"  # Lima-Puente Piedra aproximado, precisión 6
    geopoint = firestore.GeoPoint(-11.86, -77.07)

    reports = [
        {"type": "text", "text": "Tres sujetos con cuchillo en la esquina del parque, mucha gente alrededor."},
        {"type": "text", "text": "Robaron un celular a una señora, los ladrones huyeron en moto."},
        {"type": "text", "text": "Vecino raro merodea desde hace 20 minutos cerca del kiosko."},
        {"type": "panic", "text": None},
    ]
    for r in reports:
        doc_ref = db.collection("reports").document()
        payload = {
            "authorUid": uid,
            "type": r["type"],
            "location": geopoint,
            "geohash": geohash,
            "status": "received",
            "attendedBy": None,
            "createdAt": now,
            "updatedAt": now,
        }
        if r["text"]:
            payload["text"] = r["text"]
        doc_ref.set(payload)
        print(f"  ✓ report {r['type']:5s}  id={doc_ref.id}")

    fichas = [
        {"name": "Lucía Pérez", "age": 23, "description": "Última vez vista en mercado central, jean azul."},
        {"name": "Ricardo Vargas", "age": 67, "description": "Tiene Alzheimer leve. Polo verde y gorra."},
    ]
    for f in fichas:
        doc_ref = db.collection("missing_persons").document()
        embedding = [random.uniform(-1, 1) for _ in range(64)]
        doc_ref.set({
            "registrantUid": uid,
            "name": f["name"],
            "age": f["age"],
            "description": f["description"],
            "lastSeenZone": "centro",
            "lastSeenGeohash": geohash,
            "photoUrl": "",
            "embedding": embedding,
            "active": True,
            "createdAt": now,
            "closedAt": None,
        })
        print(f"  ✓ missing  {f['name']:20s}  id={doc_ref.id}")

    print("\nSeed completo.")


if __name__ == "__main__":
    main()
