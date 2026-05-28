# Willay — Guía de setup local

## Requisitos previos

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| Java JDK | 21+ | [Temurin JDK 21](https://adoptium.net/temurin/releases/?version=21) (.msi) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) o `winget install OpenJS.NodeJS.LTS` |
| Python | 3.11+ | [python.org](https://python.org) (marcar "Add to PATH") |
| Firebase CLI | latest | `npm install -g firebase-tools` |
| Expo Go | — | App Store (iPhone) o Google Play (Android) |
| Git | — | [git-scm.com](https://git-scm.com) |

> **Java 21 es obligatorio.** Verificar con `java -version` — debe mostrar `openjdk 21.0.x`. Si tenés Java 8, los emuladores de Firebase no arrancan.

---

## 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd WILLAY-intento2
```

---

## 2. Configurar Firebase

### Opción A — Usar el proyecto existente (willay-tas)

El proyecto ya está creado en Firebase Console. Copiar las credenciales del `.env` compartido (o pedirlas al compañero que las tenga).

### Opción B — Cada uno crea su propio proyecto

1. Ir a [Firebase Console](https://console.firebase.google.com) → **Crear proyecto**
2. Registrar una app **Web** para obtener:
   - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
3. Copiar `willay-app/.env.example` → `willay-app/.env` y pegar esos valores
4. En Authentication → Sign-in method, habilitar **Anónimo**
5. Opcional (para Google Sign-In): crear client IDs de OAuth Web/iOS/Android y agregarlos al `.env`

> **Recomendado para pruebas rápidas:** Usar willay-tas y trabajar con los emuladores locales.

---

## 3. Instalar dependencias

### Frontend (willay-app)

```bash
cd willay-app
npm install
```

Copiar el `.env` de ejemplo y ajustar:

```bash
cp .env.example .env
```

Valores típicos para desarrollo local:

```env
USE_EMULATORS=true
EMULATOR_HOST=localhost
USE_FACENET=false
EAS_PROJECT_ID=
```

> Si probás desde un **iPhone físico** (Expo Go), cambiá `EMULATOR_HOST` por la IP local de tu PC (ej. `192.168.1.90`). En Android emulator no hace falta (usa `10.0.2.2` automáticamente).

### Backend (functions)

```bash
cd functions
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\pip install -r requirements-dev.txt
```

(Opcional) Crear `functions/.env` con la API key de Gemini si querés clasificación por IA:

```
GEMINI_API_KEY=tu_key_acá
```

Sin esta key, el clasificador funciona solo con reglas locales (etapa A). Los textos de baja confianza se asignan como P3.

---

## 4. Correr los emuladores de Firebase

Desde la **raíz del proyecto**:

```bash
firebase emulators:start
```

Esto levanta:

| Emulador | Puerto |
|---|---|
| Auth | `:9099` |
| Firestore | `:8080` |
| Storage | `:9199` |
| Functions | `:5001` |
| Hosting | `:5000` |
| UI (Firebase Console local) | `:4000` |

Dejalo corriendo en una terminal. No lo cierres mientras uses la app.

---

## 5. Iniciar la app

En otra terminal:

```bash
cd willay-app
npx expo start
```

Escaneá el QR con Expo Go (iPhone/Android) o presioná `w` para abrir en navegador web.

En la pantalla de login, elegí **"Entrar anónimo (emulador)"** — no necesita Google OAuth configurado.

---

## 6. Probar funcionalidades básicas

| Funcionalidad | Cómo probarla |
|---|---|
| **Login anónimo** | Botón "Entrar anónimo (emulador)" en la pantalla de login |
| **Onboarding** | Después del login, seleccionar una zona |
| **Botón de pánico** | Mantener presionado 2 segundos en la pestaña principal |
| **Reporte de texto** | Pestaña "Reportar", escribir hasta 280 caracteres, enviar |
| **Panel de operador** | Pestaña "Operador" (visible después de crear un reporte P1/P2) |
| **Personas perdidas** | Pestaña "Fichas" — crear una ficha, luego escanear un rostro |

---

## 7. Estructura del proyecto

```
WILLAY-intento2/
├── crafting/           # Documentación del proyecto (especificación, ADRs, roadmap)
├── functions/          # Backend: Cloud Functions en Python
│   ├── classifier/     #   Clasificador híbrido (reglas + Gemini)
│   ├── tests/          #   Tests con pytest
│   ├── main.py         #   5 funciones cloud exportadas
│   ├── push.py         #   Helper de Expo Push Notifications
│   └── requirements.txt
├── willay-app/         # Frontend: Expo (React Native / TypeScript)
│   ├── app/            #   Rutas (Expo Router)
│   │   ├── (auth)/     #     Login, onboarding
│   │   ├── (tabs)/     #     Panic, Reportar, Fichas, Operador, Perfil
│   │   ├── missing/    #     Personas perdidas (nueva, detalle, scan)
│   │   └── report/     #     Detalle de reporte
│   ├── components/     #   Componentes UI reutilizables
│   ├── lib/            #   Lógica: Firebase, auth, geohash, push, FaceNet
│   ├── theme/          #   Paleta de colores (dark theme)
│   └── .env            #   Configuración (no subir a git)
├── firebase.json       # Configuración de Firebase emulators + hosting
├── firestore.rules     # Reglas de seguridad de Firestore
└── storage.rules       # Reglas de seguridad de Storage
```

---

## Troubleshooting

| Problema | Solución |
|---|---|
| `java -version` muestra 1.8 | Instalar JDK 21 y sacar rutas viejas de Oracle del PATH |
| `firebase emulators:start` no arranca | Verificar Java 21+ y que puertos 8080/9099/5001/etc. estén libres |
| `auth/network-request-failed` | Si `USE_EMULATORS=true`, asegurar que los emuladores estén corriendo. Si `false`, habilitar "Anónimo" en Firebase Console |
| Puerto 8080 ocupado | `netstat -ano \| findstr :8080` → `taskkill /PID <PID> /F` |
| Expo Go no conecta al emulador | En iPhone físico: `EMULATOR_HOST=192.168.x.x` (IP LAN de tu PC). Firewall de Windows: permitir conexiones entrantes |
| `babel-preset-expo` not found | `npx expo install babel-preset-expo` |
| Las Cloud Functions dan error en emulador | Revisar que el venv de Python esté correcto: `functions\venv\Scripts\pip install -r requirements.txt` |

---

## Notas importantes

- **No committear** archivos `.env`, `venv/`, `node_modules/`, `__pycache__/`
- FaceNet **no está implementado** (es un stub). Dejar `USE_FACENET=false` para usar el mock
- Google Sign-In no funciona sin client IDs. Usar el login anónimo
- Los emuladores usan datos en memoria; al cerrarlos se pierde todo
