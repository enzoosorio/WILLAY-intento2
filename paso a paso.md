3 — Levantar emuladores + app (dos terminales)
Terminal 1 (raíz del repo):

firebase emulators:start
# UI disponible en http://localhost:4000
Terminal 2 (willay-app/):

npx expo start --clear
# Escanear el QR con Expo Go → autenticar con "Entrar anónimo"
Terminal 3 — seed de datos de demo (una vez autenticado, copiar el UID de la consola de Auth del emulador):

$env:FIRESTORE_EMULATOR_HOST="localhost:8080"
python tools/seed_demo.py <uid-del-usuario>
Terminal 4 — hacer ese usuario operador:

$env:FIRESTORE_EMULATOR_HOST="localhost:8080"
python tools/make_operator.py <uid-del-usuario>
# Recargar la app → aparece el tab "Operador"