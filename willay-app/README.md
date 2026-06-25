# Willay — cliente Expo

Cliente único (Android · iOS · Web operador) del MVP universitario Willay.
Fuente de verdad de las decisiones: [`../crafting/`](../crafting/).

## Stack

| Pieza | Versión |
|---|---|
| Expo SDK | 54 |
| React Native | 0.81 |
| React | 19.1 |
| Expo Router | 6 (file-based, typed routes) |
| Firebase JS SDK | 11 (modular) |
| Auth | `expo-auth-session` + Google Sign-In (anonymous fallback en emulador) |
| Push | `expo-notifications` + Expo Push API (ver "Desviaciones") |
| Visión facial | flag `FACE_BACKEND` — remote HTTP / mock perceptual hash / FaceNet TFJS |
| TypeScript | 5.9 strict |

## Quick start

```bash
# 1. Dependencias
cd willay-app
npm install

# 2. .env
cp .env.example .env
# ya viene rellenado con las keys de willay-tas; ajustá OAuth/EAS cuando los tengas

# 3. Emuladores Firebase (otra terminal, en la raíz del repo)
cd ..
firebase emulators:start

# 4. App
cd willay-app
npx expo start
```

En Expo Go, escaneá el QR. En la pantalla de Sign-In, mientras no haya OAuth
client IDs, usá **"Entrar anónimo (solo emulador)"** — el emulador Auth no
necesita credenciales reales.

## Variables de entorno

Todas viven en `.env` y se exponen vía `app.config.ts` → `Constants.expoConfig.extra`
→ `lib/env.ts`. Si agregás una nueva, actualizá los tres puntos.

| Variable | Para qué | Bloquea si falta |
|---|---|---|
| `FIREBASE_*` | Inicialización del JS SDK | Sí (fatal) |
| `GOOGLE_*_CLIENT_ID` | Sign-In con Google | No (cae a "anonymous" en emulador) |
| `USE_EMULATORS` | `true` apunta a localhost; `false` a prod | — |
| `EMULATOR_HOST` | Host del emulator (Android auto-mapea a 10.0.2.2) | — |
| `USE_FACENET` | `true` carga TFJS; `false` usa mock perceptual hash | No |
| `FACE_BACKEND` | `remote` usa un endpoint HTTP propio; `onnx`/`facenet`/`mock` según fallback | No |
| `FACE_REMOTE_URL` | URL base del backend facial remoto | Sí, si usás `remote` |
| `EAS_PROJECT_ID` | Push tokens en device físico | No (sin esto, push deshabilitado en dev) |

## Estructura

```
willay-app/
├── app/                          ← Expo Router (file-based)
│   ├── _layout.tsx              ← bootea Firebase + auth-gate
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── onboarding.tsx       ← zona + 2 consentimientos
│   ├── (tabs)/
│   │   ├── index.tsx            ← Pánico (long-press 2s)
│   │   ├── report.tsx           ← Reporte de texto ≤280
│   │   ├── my-reports.tsx       ← Mis reportes + estado
│   │   ├── missing.tsx          ← Feed de fichas
│   │   ├── operator.tsx         ← Bandeja P1/P2 (oculto si role≠operator)
│   │   └── profile.tsx          ← Diagnóstico + logout
│   ├── missing/
│   │   ├── new.tsx              ← Crear ficha (foto + embedding)
│   │   ├── scan.tsx             ← Avistamiento (foto → match local)
│   │   └── [id].tsx             ← Detalle + cerrar
│   ├── report/[id].tsx
│   └── privacy.tsx
├── lib/
│   ├── env.ts                   ← acceso tipado a Constants.extra
│   ├── firebase.ts              ← singletons + emulator wiring
│   ├── auth.ts                  ← signInWithEmail, registerWithEmail, signInAnonymouslyApp
│   ├── session.ts               ← useAuthUser, useUserDoc, ensureUserDoc
│   ├── collections.ts           ← refs + queries tipadas
│   ├── functions.ts             ← wrappers de callables
│   ├── location.ts              ← getCurrentWithGeohash
│   ├── geohash.ts               ← ngeohash + 8 vecinos
│   ├── push.ts                  ← registerForPushAsync
│   ├── storage.ts               ← upload de fotos
│   ├── zones.ts
│   └── face/
│       ├── types.ts             ← interface FaceEmbedder + cosineSimilarity
│       ├── mock.ts              ← perceptual hash 8×8
│       ├── facenet.ts           ← TFJS lazy (requiere dev build)
│       └── index.ts             ← factory según USE_FACENET
├── components/ui/
│   ├── PrimaryButton.tsx
│   └── Screen.tsx
├── types/models.ts              ← espejo de crafting/04-data-model.md
├── theme/colors.ts
├── app.json                     ← config estática Expo
├── app.config.ts                ← capa dinámica ($VAR → process.env)
├── metro.config.js              ← packageExports para firebase v11
├── babel.config.js              ← react-native-worklets/plugin (último)
└── tsconfig.json
```

## Desviaciones documentadas

### ADR-009 — Push: Expo Push API en lugar de FCM topics

`@react-native-firebase/messaging` requiere dev build (rompe Expo Go).
Cambiamos a `expo-notifications` (token de Expo) + Cloud Function que consulta
`users` por geohash propio + 8 vecinos y envía vía
`https://exp.host/--/api/v2/push/send`. UX equivalente, funciona en Expo Go.

### ADR-004 — Visión facial: dos backends con flag

| `USE_FACENET` | Backend | Requiere | Cuándo usar |
|---|---|---|---|
| `false` (default) | Perceptual hash 8×8 | Nada extra | Demo en Expo Go; flujo end-to-end |
| `true` | MobileFaceNet TFJS | Dev build + paquetes tfjs + modelo en `assets/models/facenet/` | Calidad real |

Si FaceNet falla en runtime, el factory **degrada al mock** y logguea — la demo
nunca se rompe. La interfaz es la misma (`embed(uri) → number[]`).

### F1 — `onUserCreated`: client-side

`firebase-functions` v2 Python no expone trigger Auth. Por simplicidad, el
doc `users/{uid}` se crea desde el cliente (`ensureUserDoc` en `lib/session.ts`)
tras `onAuthStateChanged`. Idempotente.

## Notas de compat (gotchas conocidos)

- **`metro.config.js`** ya tiene `unstable_enablePackageExports = true`. Sin
  esto, `firebase/auth` tira "Component auth has not been registered yet".
- **Auth persistente:** `initializeAuth + getReactNativePersistence(AsyncStorage)`
  en `lib/firebase.ts`. Sin esto, la sesión se pierde al reabrir la app.
- **Reanimated/Worklets:** `react-native-worklets/plugin` debe ir último en
  `babel.config.js`.
- **Android emulator:** `EMULATOR_HOST=localhost` se mapea automáticamente a
  `10.0.2.2` en `lib/env.ts`.
- **Push token en simulador:** Expo no entrega tokens fuera de device físico;
  `registerForPushAsync` retorna `null` sin romper la app.

## Cómo correr cada escenario

| Quiero… | Cómo |
|---|---|
| Probar la app sin OAuth | `USE_EMULATORS=true` + botón "Entrar anónimo" |
| Probar pánico con push real | Necesitás 2 cuentas con `expoPushTokens` salvados; correr en device físico con `EAS_PROJECT_ID` |
| Convertir a operador | `firebase emulators:start` (otra terminal) + `FIRESTORE_EMULATOR_HOST=localhost:8080 python ../tools/make_operator.py <uid>` |
| Probar Gemini fallback | `GEMINI_API_KEY=…` en `functions/.env` + texto ambiguo |
| Probar visión real | `FACE_BACKEND=remote` + `FACE_REMOTE_URL=<url>` |

## Roadmap (ver `../crafting/08-roadmap.md`)

- [x] F0 — Scaffold + Firebase wiring
- [x] F1 — Sign-In + onboarding + creación de `users/{uid}`
- [x] F2 — Pánico + fan-out (Expo Push)
- [x] F3 — Reporte texto + triaje + bandeja operador
- [x] F4 — Fichas + scan facial (mock; FaceNet stub listo)
- [ ] F5 — Demo, métricas, pulido
