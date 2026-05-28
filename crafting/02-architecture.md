# 02 — Arquitectura

## Diagrama de contexto (C4 — nivel 1)

```
                        ┌──────────────────────┐
                        │  Gemini API (Google) │
                        └──────────┬───────────┘
                                   │ (fallback NLP)
                                   │
  ┌────────────┐   push    ┌───────┴────────┐    push    ┌────────────┐
  │ Vecino     │◄──────────│                │───────────►│ Operador   │
  │ (Flutter)  │──reportes─►   Willay BE    │            │ (Flutter,  │
  └────────────┘           │  (Firebase)    │            │  rol OP)   │
                           │                │            └────────────┘
  ┌────────────┐ embeddings│                │
  │ Familiar   │──fichas──►│                │
  │ (Flutter)  │           └────────────────┘
  └────────────┘
```

## Diagrama de contenedores (C4 — nivel 2)

```
┌────────────────────── Cliente Flutter (Android / iOS) ──────────────────────┐
│  UI · ML Kit Face Detection · MobileFaceNet TFLite · FCM SDK · Firebase SDK │
└──────────────┬───────────────────────────────┬────────────────┬─────────────┘
               │ Firestore SDK                 │ Storage SDK    │ Functions
               │ (lectura/escritura            │ (foto cruda    │ HTTPS
               │  con security rules)          │  efímera)      │
               ▼                               ▼                ▼
┌─────────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Cloud Firestore         │  │ Cloud Storage       │  │ Cloud Functions 2g  │
│ - users                 │  │ - /missing/{id}.jpg │  │ - onPanicCreate     │
│ - reports               │  │ - /sightings/...    │  │ - onReportCreate    │
│ - missing_persons       │  │   (TTL 24h)         │  │ - onSightingMatch   │
│ - sightings             │  └─────────────────────┘  │ - classifyText      │
│ - notifications         │                           │ - fanoutPanic       │
└─────────────────────────┘                           └─────────┬───────────┘
                                                                │
                                                       ┌────────┴────────┐
                                                       │ Gemini API      │
                                                       │ (zona gris NLP) │
                                                       │                 │
                                                       │ FCM             │
                                                       │ (push topics+   │
                                                       │  geohash)       │
                                                       └─────────────────┘
```

## Decisiones arquitectónicas clave (resumen — detalle en `03-tech-decisions.md`)

| # | Decisión | Trade-off aceptado |
|---|---|---|
| ADR-001 | Flutter como cliente único | Curva inicial, pero un solo equipo de UI cubre Android/iOS/web operador. |
| ADR-002 | Firebase como backend | Lock-in a Google. Aceptable por scope MVP y costo $0/bajo. |
| ADR-003 | Cloud Functions 2nd gen (Python) sin min-instance | Cold starts ~5–8s en el primer disparo del día. Documentado. |
| ADR-004 | Reconocimiento facial on-device (ML Kit detect + MobileFaceNet embed) | Embedding "demostrativo", no policial. Sin biometría en servidor (solo vectores). |
| ADR-005 | Embeddings comparados en cliente (descarga fichas activas en radio) | No escala >~500 fichas; aceptable para demo. |
| ADR-006 | Triaje texto híbrido (reglas → Gemini fallback) | Más código, pero ~70% sin red y costo Gemini acotado. |
| ADR-007 | Google Sign-In para MVP (no Phone Auth) | Pierdes "cualquier celular sin Google". Phone Auth → v1.1. |
| ADR-008 | Geohashing para queries por radio en Firestore | Lib externa (`geoflutterfire_plus`) y campo `geohash` duplicado en docs. |
| ADR-009 | FCM por topics geohash, no por lista de tokens | Más simple y barato; pierde personalización fina. |

## Reformulación de RNFs (vs `Willay.md` §3.2)

| ID | Original | Reformulado en este doc |
|---|---|---|
| RNF-01 | "Latencia <3s end-to-end" | "<3s en estado warm; cold-start hasta ~8s, aceptado como trade-off MVP" |
| RNF-02 | "Funcional en 3G" | Mantenido. Validado solo con throttling DevTools. |
| RNF-03 | "≤3 pasos acciones críticas" | Mantenido. Verificado en `10-testing-strategy.md`. |
| RNF-04 | "Ley 29733 cumplimiento" | Reformulado: "mínimo legal demostrable" — ver `07-security-privacy.md`. |
| RNF-05 | "Escala a 10.000 usuarios" | Reformulado: "heredamos escalabilidad de Firebase; no validada empíricamente". |

## Componentes (responsabilidad por pieza)

### Cliente Flutter
- Captura UI (formularios, mapa, cámara, botón pánico).
- Detección facial con ML Kit (recortar caras).
- Embedding con MobileFaceNet TFLite.
- Comparación de embeddings por **similitud coseno** contra fichas activas descargadas.
- Suscripción a topics FCM por geohash.

### Firestore
- Almacén de estado: users, reports, missing_persons (con embedding), sightings, notifications.
- Reglas de seguridad como **única barrera de autorización** (no hay servidor proxy).

### Cloud Storage
- Fotos crudas de fichas y avistamientos. Vida útil corta para avistamientos (regla TTL 24h via Cloud Function programada).

### Cloud Functions (2nd gen, Python)
- `onReportCreate`: ejecuta reglas + Gemini fallback, escribe `priority` y `status`.
- `onPanicCreate`: dispara fan-out FCM al geohash del incidente.
- `onMissingMatchClient` (callable): recibe `missingPersonId` cuando el cliente detecta match → notifica al familiar registrante.
- `cleanupSightings` (scheduled): borra avistamientos sin match >24h.

### Gemini API
- Solo invocado desde `onReportCreate` cuando las reglas no resuelven (ver `06-ml-pipeline.md`).

### FCM
- Topics por geohash de precisión 6 (~1.2km celda). El radio 500m del RF-07 se aproxima suscribiendo al geohash propio + 8 vecinos.
