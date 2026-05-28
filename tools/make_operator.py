"""
Asigna rol "operator" a un uid dado (T1.5).

Uso:
    # Producción (requiere GOOGLE_APPLICATION_CREDENTIALS apuntando a un service-account JSON):
    python tools/make_operator.py <uid>

    # Emulador local (cuando firebase emulators:start está corriendo):
    FIRESTORE_EMULATOR_HOST=localhost:8080 python tools/make_operator.py <uid>

Requisitos:
    pip install firebase-admin

Si todavía no creaste un service-account: Firebase Console → Project settings
→ Service accounts → Generate new private key → guardalo como
willay-sa.json fuera del repo y exportá la variable de entorno.
"""
from __future__ import annotations

import os
import sys

import firebase_admin
from firebase_admin import credentials, firestore


def main() -> None:
    if len(sys.argv) != 2:
        print("Uso: python tools/make_operator.py <uid>")
        sys.exit(1)

    uid = sys.argv[1].strip()
    if not uid:
        print("uid vacío")
        sys.exit(1)

    using_emulator = bool(os.environ.get("FIRESTORE_EMULATOR_HOST"))

    if using_emulator:
        # En emulador no necesitamos credenciales reales.
        firebase_admin.initialize_app(options={"projectId": os.environ.get("GCLOUD_PROJECT", "willay-tas")})
        print(f"[emulator] FIRESTORE_EMULATOR_HOST={os.environ['FIRESTORE_EMULATOR_HOST']}")
    else:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path:
            print("ERROR: setear GOOGLE_APPLICATION_CREDENTIALS apuntando a willay-sa.json")
            sys.exit(2)
        firebase_admin.initialize_app(credentials.Certificate(cred_path))

    db = firestore.client()
    ref = db.collection("users").document(uid)
    snap = ref.get()
    if not snap.exists:
        print(f"ERROR: users/{uid} no existe. El usuario tiene que loguearse al menos una vez.")
        sys.exit(3)

    ref.update({"role": "operator"})
    print(f"✓ users/{uid}.role = operator")


if __name__ == "__main__":
    main()
