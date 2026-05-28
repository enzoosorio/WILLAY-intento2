# 08 — Roadmap por fases

Cada fase termina con un **artefacto demostrable** y entra en testing antes de pasar a la siguiente. El detalle de tareas vive en `09-tasks.md`.

---

## F0 — Scaffold y cimientos (semana 1)

**Objetivo:** repositorio listo, proyectos Firebase y Flutter creados, CI mínima, reglas base.

**Artefacto:** app Flutter "hola Willay" desplegada en Firebase Hosting (web) y APK instalable; emulador Firebase corre local.

**Salida:**
- Repo con estructura definida.
- `firebase.json`, `firestore.rules`, `firestore.indexes.json` versionados.
- Pipeline GitHub Actions: lint Flutter + tests reglas.

---

## F1 — Auth + perfil + zona (semana 2)

**Objetivo:** un usuario puede registrarse con Google y elegir su zona.

**Artefacto:** flujo "abrir app → Sign-In Google → elegir zona → ver pantalla principal vacía".

**Salida:**
- `users/{uid}` se crea automáticamente al primer login (vía Cloud Function `onUserCreated`).
- Pantalla de selección de zona y consentimientos (dos checkboxes).
- Operador identificable: usuario con `role=operator` setado manualmente en consola para demo.

---

## F2 — Botón de pánico + fan-out push (semana 3)

**Objetivo:** activar pánico envía push a vecinos cercanos y aparece en bandeja del operador.

**Artefacto:** dos teléfonos: uno activa pánico, el otro (en la misma celda geohash) recibe push.

**Salida:**
- RF-02, RF-07.
- Cloud Function `onPanicCreate` + `fanoutPanic` por topic FCM.
- Vista mínima de operador (lista, sin filtros aún).

---

## F3 — Reporte de texto + triaje híbrido (semana 4)

**Objetivo:** ciudadano escribe reporte, IA híbrida clasifica, operador ve solo P1/P2.

**Artefacto:** 5 reportes de prueba (mix de keywords claros y ambiguos) clasificados correctamente, con `priorityReason` visible en debug.

**Salida:**
- RF-03.
- `classifyText` con reglas + Gemini fallback.
- Bandeja del operador con filtro P1/P2 y acciones atender/descartar (RF-06).
- Estado del reporte visible para el ciudadano (RF-08).

---

## F4 — Fichas de desaparecidos + visión on-device (semanas 5–6)

**Objetivo:** familiar crea ficha; vecino sube avistamiento; match dispara notificación.

**Artefacto:** dataset interno de 5 fichas; demo de avistamiento positivo (match) y negativo (no match, foto no se sube).

**Salida:**
- RF-04, RF-05.
- ML Kit + MobileFaceNet TFLite integrados en Flutter.
- Función `onSightingCreate` notifica al registrant.
- Calibración del umbral 0.85 documentada.

---

## F5 — Pulido, narrativa de demo y testing final (semana 7)

**Objetivo:** ensayo de demo, métricas medidas, documentación entregable.

**Artefacto:**
- Script de demo de 7 minutos.
- Tabla de métricas reales medidas (latencia warm/cold, % triaje sin Gemini, tiempo registro).
- Privacy policy en la app y NDAs simbólicas firmadas.

---

## Backlog post-MVP (no entra en la entrega de curso)

- Phone Auth (SMS) como alternativa a Google.
- Vector DB real (pgvector / Vertex Matching Engine).
- Vista de mapa con clustering avanzado.
- Integración con cámaras municipales / Serenazgo real.
- Chat operador-ciudadano (RF-08 lo excluye explícitamente).
- DPIA y registro ANPDP.
