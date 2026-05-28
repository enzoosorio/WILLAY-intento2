# 05 — Contratos de API

Toda la lógica server-side vive en Cloud Functions 2nd gen (Python). Hay dos tipos de funciones:

- **Triggers Firestore:** se disparan por evento de escritura (sin contrato HTTP).
- **Callable Functions:** invocadas explícitamente desde el cliente Flutter vía Firebase SDK (`https.onCall`).

Las funciones que el cliente invoca directamente son las únicas con "contrato público". El resto son internas.

---

## Triggers (sin contrato externo)

### `onReportCreate`
- **Evento:** `reports/{reportId}` `onDocumentCreated`.
- **Acción:** lee `type`, `text`, `location`. Si `type=panic` → `priority=P1`, `priorityReason="panic:default_P1"`, dispara `fanoutPanic`. Si `type=text` → ejecuta `classifyText` (interno) → escribe `priority`, `priorityReason`.
- **Idempotencia:** usa `reportId` como clave; si reentra, no reescribe `priority` si ya existe.

### `onSightingCreate`
- **Evento:** `sightings/{sightingId}` `onDocumentCreated`.
- **Acción:** si `matchedMissingId` existe (el cliente ya determinó match), notifica al `registrantUid` de esa ficha vía FCM y crea documento en `notifications`.

### `cleanupSightings`
- **Evento:** `scheduler` cada 1h.
- **Acción:** borra documentos `sightings` con `matchedMissingId=null` y `createdAt < now-24h`, junto con su `photoUrl` en Storage.

---

## Callable Functions (contrato público)

### `classifyText` — interno, pero documentado por testing

Aunque hoy se llama desde `onReportCreate`, lo definimos como función reutilizable.

**Input:**
```json
{ "text": "string ≤ 280 chars" }
```
**Output:**
```json
{
  "priority": "P1" | "P2" | "P3",
  "reason": "rules:<keyword>" | "gemini:<label>",
  "usedGemini": true
}
```
**Errores:** `invalid-argument` si texto vacío o >280.

---

### `panicEcho` — health check para la demo

**Input:** `{}`
**Output:** `{ "ok": true, "warm": true|false, "ts": <iso> }`
**Uso:** botón "calentar" en pantalla del operador para mitigar cold start antes de la demo.

---

### `markReportStatus` — operador cambia estado

Permisos: solo `users.role == "operator"` (validado en regla + en función).

**Input:**
```json
{
  "reportId": "string",
  "status": "attending" | "closed" | "dismissed"
}
```
**Output:** `{ "ok": true }`
**Errores:** `permission-denied`, `not-found`, `failed-precondition` (transición inválida).

**Transiciones válidas:**
- `received → attending | dismissed`
- `attending → closed | dismissed`
- Terminales: `closed`, `dismissed`.

---

## Convención de errores

Todos los callables devuelven `HttpsError` con `code` estándar Firebase:
- `invalid-argument` — payload mal formado.
- `permission-denied` — falta auth o rol.
- `not-found` — recurso no existe.
- `failed-precondition` — estado no permite la operación.
- `internal` — fallo Gemini / Firestore inesperado.

## Versionado

- Prefijo de región: `southamerica-east1`.
- No hay versionado en URL para MVP; un cambio breaking se anuncia en el chat del equipo y se acompaña de PR coordinado en cliente.
