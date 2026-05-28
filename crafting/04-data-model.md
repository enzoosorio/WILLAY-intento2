# 04 — Modelo de datos (Firestore)

Convención: nombres de colección en `snake_case` plural; campos en `camelCase`. Timestamps siempre como `Timestamp` de Firestore (no string).

## Colecciones

### `users/{uid}`

| Campo | Tipo | Notas |
|---|---|---|
| `displayName` | string | máx 60 chars |
| `zone` | string | enum: `zapallal`, `la_ensenada`, `huamantanga`, `centro`, `otros` |
| `role` | string | enum: `citizen`, `operator` (default `citizen`) |
| `geohash` | string | última ubicación conocida (precision 6) |
| `lastLocation` | geopoint | opcional, solo si el usuario lo permite |
| `fcmTokens` | array<string> | tokens del dispositivo |
| `consentBiometric` | boolean | true si aceptó subir embeddings |
| `createdAt` | timestamp | server timestamp |

### `reports/{reportId}`

| Campo | Tipo | Notas |
|---|---|---|
| `authorUid` | string | quien reporta |
| `type` | string | enum: `panic` \| `text` |
| `text` | string | máx 280 chars, presente si `type=text` |
| `location` | geopoint | obligatorio |
| `geohash` | string | precision 6 |
| `priority` | string | enum: `P1` \| `P2` \| `P3` — **escrito solo por Cloud Function** |
| `priorityReason` | string | "rules:keyword=arma" \| "gemini:high_risk" \| "panic:default_P1" |
| `status` | string | enum: `received` \| `attending` \| `closed` \| `dismissed` (default `received`) |
| `attendedBy` | string \| null | uid del operador que tomó la alerta |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Reglas clave:**
- El cliente solo puede escribir `authorUid`, `type`, `text`, `location`, `geohash`, `createdAt`.
- `priority`, `priorityReason`, `status`, `attendedBy` los escriben Cloud Functions y operadores autenticados.

### `missing_persons/{personId}`

| Campo | Tipo | Notas |
|---|---|---|
| `registrantUid` | string | quien creó la ficha |
| `name` | string | máx 80 chars |
| `age` | int | |
| `description` | string | máx 500 chars |
| `lastSeenZone` | string | enum zonas |
| `lastSeenLocation` | geopoint | opcional |
| `lastSeenGeohash` | string | precision 6 |
| `photoUrl` | string | URL en Cloud Storage |
| `embedding` | array<float> | 192 floats (MobileFaceNet); **derivado biométrico** |
| `active` | boolean | true mientras se busca |
| `createdAt` | timestamp | |
| `closedAt` | timestamp \| null | cuando registrant marca encontrado |

### `sightings/{sightingId}`

| Campo | Tipo | Notas |
|---|---|---|
| `reporterUid` | string | vecino que ve |
| `photoUrl` | string | URL en Storage; **se borra a las 24h si no hay match** |
| `embedding` | array<float> | 192 floats |
| `location` | geopoint | |
| `geohash` | string | |
| `matchedMissingId` | string \| null | id de `missing_persons` si hubo match |
| `similarity` | float | coseno [0,1] del match (si hubo) |
| `createdAt` | timestamp | |

### `notifications/{notifId}`

Historial mínimo para que el ciudadano vea sus avisos. FCM es transporte; esta colección es persistencia.

| Campo | Tipo | Notas |
|---|---|---|
| `recipientUid` | string | |
| `kind` | string | `report_status` \| `nearby_p1` \| `missing_match` |
| `payload` | map | depende del `kind` |
| `readAt` | timestamp \| null | |
| `createdAt` | timestamp | |

## Índices compuestos requeridos

- `reports`: `(status ASC, priority ASC, createdAt DESC)` para la bandeja del operador.
- `reports`: `(geohash ASC, createdAt DESC)` para mapa del ciudadano.
- `missing_persons`: `(active ASC, lastSeenGeohash ASC)` para descarga de fichas en radio.
- `sightings`: `(matchedMissingId ASC, createdAt DESC)`.

## Tamaños esperados (demo)

| Colección | Filas demo | Tamaño aprox |
|---|---|---|
| users | ~30 | <1 MB |
| reports | ~200 | <1 MB |
| missing_persons | ~10 | ~50 KB (embeddings dominan) |
| sightings | ~50 | ~50 KB |
| notifications | ~500 | <1 MB |

Total muy por debajo del free tier de Firestore.
