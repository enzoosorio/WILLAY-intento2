# 12 — Design Thinking (Fases 1 a 5)

Documento que organiza el proyecto Willay según las cinco fases del método Design
Thinking. Sirve de base para la exposición parcial y para la sección de metodología
del artículo final. Cada fase enlaza la evidencia que ya vive en el repo.

> **Mapa con la planificación del curso** (ver `LINEAMIENTOS-DEL-PROYECTO.md`):
> Fase 3 (Idear) cerró hacia la Semana 5; Fase 4 (Prototipar) corresponde a la
> Iteración 1; **Fase 5 (Testear)** corresponde a la Iteración 2 — *pruebas del
> modelo de IA*, que es lo que se presenta esta semana.

---

## Fase 1 — Empatizar

### El problema humano
En Puente Piedra (Lima Norte) un vecino que presencia un delito o una emergencia
no tiene un canal rápido y confiable para pedir ayuda. La llamada al Serenazgo es
lenta, se pierde contexto y la respuesta llega fuera de la "hora dorada" — la
ventana temprana en que la intervención todavía cambia el desenlace. En paralelo,
cuando desaparece una persona, la búsqueda depende de difusión informal por redes
sociales, sin forma estructurada de cruzar un avistamiento con la ficha.

### Usuarios y sus dolores (arquetipos)
Definidos en `01-product.md` (§Usuarios objetivo) y `Willay.md` §2.2:

| Arquetipo | Situación | Dolor principal | Necesidad |
|---|---|---|---|
| **Ricardo** — vecino vigilante | Presencia un hecho bajo estrés | No quiere exponerse ni perder tiempo | Reportar en ≤3 taps, sin fricción |
| **Milagros** — familiar en crisis | Un ser querido desapareció | La búsqueda es caótica y manual | Subir una ficha en <2 min y enterarse si alguien lo vio |
| **Operador de Serenazgo** | Recibe muchos avisos | Ruido: no distingue lo urgente | Una bandeja filtrada solo con lo crítico (P1/P2) |

### Técnicas de empatía aplicadas
- Mapa de actores y mapa de empatía por arquetipo (insumo en `Willay.md`).
- Identificación de la "hora dorada" como driver temporal del producto.

**Insight de la fase:** el cuello de botella no es la falta de información, sino la
**priorización y la latencia**. Sobra ruido y falta velocidad.

---

## Fase 2 — Definir

### Planteamiento del problema (POV)
> *Los vecinos de Puente Piedra necesitan un canal que convierta un reporte
> ciudadano en una alerta priorizada y geolocalizada en segundos, porque la
> respuesta dentro de la "hora dorada" depende de filtrar lo urgente y acortar la
> latencia entre el aviso y quien puede actuar.*

### Requerimientos del caso de negocio (en scope MVP)
Detalle en `01-product.md`. Resumen funcional:

1. Registro con selección de zona y consentimientos.
2. Botón de pánico (≤2 taps) → push a vecinos cercanos + bandeja del operador.
3. Reporte por texto (≤280) clasificado P1/P2/P3 por IA.
4. Ficha de persona desaparecida (foto + datos).
5. Avistamiento facial on-device con notificación al familiar si hay match.
6. Vista de operador con bandeja filtrada y acciones atender/descartar.
7. Estado del reporte visible para el ciudadano (Recibido → En atención → Cerrado).

### Métricas de éxito (criterios medibles)
Tomadas de `01-product.md` y medidas en `metrics-final.md`:

| Métrica | Objetivo demo |
|---|---|
| Pánico → notificación operador (warm) | <3s |
| Pánico → notificación operador (cold start) | <8s, documentado |
| Latencia comparación facial on-device | <500ms |
| % reportes clasificados sin llamar a Gemini | ≥70% |
| Flujo de registro completo | <3 min |
| Taps para activar pánico | ≤2 |

### Límites explícitos (no-goals)
No reemplaza al Serenazgo (es canal complementario); el reconocimiento facial es
un **indicio para que un humano decida**, nunca un match certificado; no se optimiza
para 10.000 usuarios concurrentes. Ver `01-product.md` §No-goals.

---

## Fase 3 — Idear

### La solución
Una sola app móvil (Expo / React Native) con dos roles —vecino y operador— sobre un
backend Firebase serverless. Dos pipelines de IA resuelven el problema definido:

1. **Triaje de texto híbrido** — reglas locales primero, Gemini solo en la "zona
   gris". Resuelve la *priorización* sin costo ni latencia en el caso común.
2. **Match facial on-device** — detección + embedding MobileFaceNet en el teléfono;
   la comparación ocurre en el cliente y solo viajan vectores, no biometría cruda.

El **botón de pánico con fan-out geohash** resuelve la *latencia*: la alerta llega a
la celda del incidente y a sus 8 vecinas vía push, sin que un humano intermedie.

### Decisiones de arquitectura que nacen de la ideación
Registradas como ADRs en `03-tech-decisions.md`. Las más relevantes para el discurso:

| ADR | Decisión | Por qué encaja con el POV |
|---|---|---|
| ADR-006 | Triaje híbrido reglas → Gemini | Prioriza rápido y barato; ~70% sin red |
| ADR-004 | Visión facial on-device | Privacidad: sin biometría cruda en servidor |
| ADR-005 | Comparación de embeddings en cliente | Evita vector DB; suficiente para la demo |
| ADR-009 | FCM/push por geohash | Fan-out de baja latencia a la zona |
| ADR-011 | Auth Email/Password (supercede Google Sign-In) | Desbloquea la demo sin configurar OAuth/SHA |

**Alternativas descartadas** quedan trazadas en cada ADR (Flutter, Supabase, Gemini
siempre, Phone Auth, vector DB en backend), lo que sostiene la narrativa de decisiones
deliberadas y no por defecto.

---

## Fase 4 — Prototipar

### Qué se construyó (artefacto funcional, no maqueta)
El prototipo es **software ejecutable**, no wireframes. Estado por capa:

**App (Expo / React Native + Expo Router).** Pantallas implementadas:
`(auth)` login/registro/onboarding/role-select; `(tabs)` home, report, mapa,
dashboard, missing, my-reports, operator, profile, buscar; flujos `missing/new`,
`missing/scan`, `localizar/[id]`, `report/[id]`, `privacy`.

**Backend (Cloud Functions 2nd gen, Python — `functions/main.py`).**
`on_report_create` (rutea panic/text), `_fanout_panic` (vecinos por geohash + Expo
Push), `on_sighting_create` (notifica al familiar ante un match), `cleanup_sightings`
(scheduled, borra avistamientos sin match >24h), `mark_report_status` (transiciones
validadas por rol), y los callables `classify_text` y `summarize_user_reports`.

**Datos y reglas.** Firestore (`users`, `reports`, `missing_persons`, `sightings`,
`notifications`), `firestore.rules`, `firestore.indexes.json`, `storage.rules`.

### Pipelines de IA prototipados
Diagramas y parámetros en `06-ml-pipeline.md`.

- **Texto:** diccionario de keywords con prioridad asociada (Etapa A) y, si la
  confianza < 0.8, prompt estructurado a `gemini-1.5-flash` (Etapa B) con parseo
  JSON estricto, timeout 4s y degradación a P3.
- **Visión:** imagen → resize 112×112 → decodificación JPEG → normalizar `[-1,1]` →
  modelo de embedding facial (ArcFace/MobileFaceNet **ONNX**, on-device con ONNX
  Runtime) → vector L2-normalizado → coseno contra fichas activas → match si supera
  el umbral. Implementado en `willay-app/lib/face/onnx.ts` (backend `FACE_BACKEND=
  onnx`), con caída automática a un embedder mock (`withFallback` en
  `lib/face/index.ts`) para que la demo nunca se rompa. El modelo se carga por URL
  en runtime para no acoplar el bundle al binario (corre en dev build, no Expo Go).

---

## Fase 5 — Testear (pruebas del modelo de IA)

Esta es la fase que se presenta esta semana. Se prueba el producto **y**, sobre todo,
los **modelos de IA**.

### 5.1 Pruebas del clasificador de texto
- **Unit tests determinísticos:** `functions/tests/test_classifier.py` cubre todas
  las categorías de keywords (P1/P2/P3) y el caso `low_signal`. Comando:
  `cd functions && pytest`.
- **Métrica de eficiencia híbrida:** se mide el % de reportes resueltos por reglas
  (sin llamar a Gemini), objetivo ≥70%. Resultado en `metrics-final.md`.
- **Validación del fallback:** entradas ambiguas se envían a Gemini y se verifica que
  devuelven un `priority` válido; ante error de parseo o timeout, degrada a P3.

### 5.2 Pruebas del modelo facial (calibración del umbral)
Procedimiento definido en `10-testing-strategy.md` y en
`willay-app/assets/models/facenet/README.md`:

1. Conjunto de prueba: **20 pares positivos** (misma persona, fotos distintas) y
   **20 pares negativos** (personas distintas).
2. Se calcula la similitud coseno de cada par con el modelo real.
3. Se elige el umbral que mejor separa ambas distribuciones (punto de partida 0.40
   para ArcFace ONNX) y se fija en `MATCH_THRESHOLD.onnx` (`lib/face/types.ts`).
4. Se reporta la matriz de confusión.

| Resultado | Conteo | |
|---|---|---|
| Verdaderos positivos (TP) | _por completar_ | match correcto |
| Falsos positivos (FP) | _por completar_ | match indebido |
| Verdaderos negativos (TN) | _por completar_ | rechazo correcto |
| Falsos negativos (FN) | _por completar_ | match perdido |
| **Umbral elegido** | _por completar_ | coseno |

> Tabla a llenar con los datos reales de la corrida de calibración; los mismos valores
> se consolidan en `metrics-final.md`.

### 5.3 Pruebas de flujo end-to-end (producto)
- **Pánico → push:** dos dispositivos en la misma celda geohash; uno activa pánico,
  el otro recibe push. Se cronometra warm y cold start.
- **Estado del reporte:** el operador marca *atendiendo* y el ciudadano recibe push.
- **Privacidad del avistamiento:** con un desconocido (sin match) se verifica que la
  foto **no se sube** (cumple RF-05 estricto).

### 5.4 Aprendizajes que retroalimentan el diseño
- El cold start de Cloud Functions degrada la métrica de latencia; mitigación:
  "calentar" la función antes de la demo (`panic_echo`) — ver ADR-003.
- El umbral facial es un trade-off precisión/recall: subirlo reduce falsos positivos
  pero pierde coincidencias legítimas; por eso el producto lo enmarca como *indicio*,
  no veredicto.

---

## Trazabilidad rápida (para las diapositivas)

| Punto exigido en la exposición | Dónde está |
|---|---|
| Descripción del proyecto | Fase 1–2 de este doc; `01-product.md` |
| Requerimientos del caso de negocio | Fase 2; `01-product.md` |
| Explicación del modelo de IA | Fase 3–4; `06-ml-pipeline.md` |
| Arquitectura de la solución | `02-architecture.md` |
| Flujo principal | Fase 4; diagramas de `06-ml-pipeline.md` |
| Ejecución del software | Demo en vivo; `SETUP.md` / `crafting/SETUP-CONFIG.md` |
| Conclusiones | Fase 5.4; `metrics-final.md` |
