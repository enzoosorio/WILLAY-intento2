# Métricas finales (medidas) — Willay

Tabla de métricas reales para la Fase 5 (Testear) y la exposición. Las métricas
derivables de datos se obtienen con `tools/measure.py`; las latencias se cronometran
en runtime y se anotan aquí.

> **Estado:** plantilla con el procedimiento de medición. Rellenar las celdas
> _por medir_ tras la corrida de la demo / calibración. No inventar valores.

---

## 1. Resumen contra objetivos

| Métrica | Objetivo | Medido | Cómo se midió |
|---|---|---|---|
| Pánico → notificación operador (warm) | <3s | _por medir_ | cronómetro entre tap de pánico y push recibido, función ya caliente |
| Pánico → notificación operador (cold start) | <8s (documentado) | _por medir_ | igual, primer disparo del día (sin `panic_echo` previo) |
| Latencia comparación facial on-device | <500ms | _por medir_ | `Date.now()` alrededor de `getFaceEmbedder().embed()` en `scan.tsx` |
| % reportes clasificados sin Gemini | ≥70% | _por medir_ | `tools/measure.py` (campo `priorityReason`) |
| Flujo de registro completo | <3 min | _por medir_ | cronometrado en ensayo de demo |
| Taps para activar pánico | ≤2 | **2** (verificado en UI) | inspección del flujo del botón de pánico |

---

## 2. Triaje de texto (salida de `tools/measure.py`)

Ejecutar contra el proyecto (o emulador con datos sembrados):

```bash
GOOGLE_APPLICATION_CREDENTIALS=willay-sa.json python tools/measure.py
# o, contra emulador:
FIRESTORE_EMULATOR_HOST=localhost:8080 python tools/measure.py
```

Pegar aquí la salida real:

```
=== Métricas de triaje de texto ===
Total reportes de texto:           _por medir_
Resueltos por reglas (sin Gemini): _por medir_
Enviados a Gemini:                 _por medir_
% clasificados SIN Gemini:         _por medir_%  (objetivo ≥70%)
```

**Evidencia adicional:** `functions/tests/test_classifier.py` — _N_ tests verdes
(`cd functions && pytest`).

---

## 3. Calibración del modelo facial (Fase 5)

Procedimiento en `willay-app/assets/models/facenet/README.md`. Con 20 pares
positivos y 20 negativos:

| Resultado | Conteo |
|---|---|
| Verdaderos positivos (TP) | _por medir_ |
| Falsos positivos (FP) | _por medir_ |
| Verdaderos negativos (TN) | _por medir_ |
| Falsos negativos (FN) | _por medir_ |
| **Umbral coseno elegido** | _por medir_ (partida: 0.85) |
| Precisión / Recall | _por medir_ |

Similitud coseno observada (rango):
- Pares positivos: _min_ – _max_ (media _x_)
- Pares negativos: _min_ – _max_ (media _x_)

Backend de visión usado en la medición: `facenet-mobilefacenet` / `mock-content-hash`
(indicar cuál — lo loguea `lib/face/index.ts`).

---

## 4. Latencias de demo (cronometradas)

| Escenario | Repetición 1 | Rep 2 | Rep 3 | Promedio |
|---|---|---|---|---|
| Pánico → push (warm) | | | | |
| Pánico → push (cold) | | | | |
| Embedding facial on-device | | | | |

---

## 5. Notas de medición

- El cold start de Cloud Functions (ADR-003) explica la diferencia warm/cold; en la
  demo se "calienta" con el callable `panic_echo` ~30s antes.
- El % sin Gemini depende del mix de reportes; el seed (`tools/seed_demo.py`) usa
  casos claros (cuchillo, robo, merodeador) que las reglas resuelven, más casos
  ambiguos para ejercitar el fallback.
