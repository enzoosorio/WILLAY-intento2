# 06 — Pipelines de IA

Dos pipelines independientes: **texto** (clasificación P1/P2/P3) y **visión** (match facial).

---

## Pipeline 1 — Triaje de texto (híbrido)

### Diagrama

```
texto reporte (≤280)
        │
        ▼
┌──────────────────────────┐
│ Etapa A: reglas locales  │
│ - keywords críticos      │
│ - heurísticas simples    │
└──────────┬───────────────┘
           │
   ¿matched & confianza ≥ 0.8?
       │ sí        │ no
       ▼           ▼
   priority     ┌──────────────────────┐
   y reason     │ Etapa B: Gemini      │
                │ prompt estructurado  │
                └──────────┬───────────┘
                           ▼
                   priority + reason
```

### Etapa A: reglas locales

Implementada en `classifyText` antes de cualquier llamada a Gemini.

**Diccionario de keywords (caso-insensitive, con tildes normalizadas):**

| Categoría | Términos | Priority asignada |
|---|---|---|
| Arma / violencia letal | `arma`, `pistola`, `cuchillo`, `disparo`, `disparos`, `balacera` | P1 |
| Vulnerabilidad crítica | `niño`, `niña`, `bebé`, `secuestro`, `rapto`, `desaparecido` | P1 |
| Violencia física | `golpe`, `golpes`, `agresión`, `pelea`, `sangre` | P2 |
| Patrimonial activo | `robo`, `asalto`, `arrebato`, `me roban` | P2 |
| Sospecha / observación | `sospechoso`, `merodea`, `merodeando`, `extraño` | P3 |

**Reglas adicionales:**
- Si el texto contiene ≥2 categorías → toma la más alta.
- Si el texto tiene <10 caracteres significativos → `priority=P3, reason="rules:low_signal"`.

**Salida si confianza alta:** se omite Gemini.

### Etapa B: Gemini (fallback)

**Modelo:** `gemini-1.5-flash` (más barato y rápido que pro; suficiente para clasificación corta).

**Prompt (plantilla, no constante de código — vive aquí como contrato):**

```
Eres un clasificador de emergencias ciudadanas en Lima, Perú.
Recibirás un reporte breve (≤280 chars) de un vecino.
Devuelve UN JSON con esta forma exacta:
{"priority":"P1|P2|P3","label":"<una etiqueta corta>"}

Criterios:
- P1: vida en riesgo inmediato (armas, niños en peligro, secuestro, herida grave).
- P2: delito en curso o reciente sin riesgo vital inmediato (robos, agresiones físicas).
- P3: sospecha, observación, daño menor, información ambigua.

Reporte:
"""{text}"""
```

**Validación del output:** parsear JSON estricto. Si falla → `priority=P3, reason="gemini:parse_error"` y se loguea para revisión manual.

**Timeout:** 4s. Si excede → fallback a `P3, reason="gemini:timeout"`.

---

## Pipeline 2 — Match facial

### Diagrama

```
                        ┌─────────────────────────────┐
                        │ Familiar crea ficha         │
                        │  - foto                     │
                        │  - ML Kit detecta cara      │
                        │  - MobileFaceNet → embedding│
                        │  - guarda en missing_persons│
                        └─────────────────────────────┘

  ┌──────────────────────────────────────────────────────────┐
  │ Vecino abre cámara y captura sospechoso                  │
  │  1. ML Kit detecta cara (recorta)                        │
  │  2. MobileFaceNet → embedding 192-d                      │
  │  3. Descarga fichas activas en geohash± (radio ~10km)    │
  │  4. Calcula coseno contra cada embedding                 │
  │  5. Si max(coseno) ≥ 0.85 → crea sighting con match      │
  │  6. Trigger onSightingCreate notifica al familiar        │
  │  7. Si no hay match: la foto NO se sube; solo embedding  │
  │     se descarta. (cumple RF-05 estricto)                 │
  └──────────────────────────────────────────────────────────┘
```

### Parámetros

| Parámetro | Valor MVP | Justificación |
|---|---|---|
| Modelo de embedding | MobileFaceNet (TFLite, 192-d) | Liviano, ~1MB, suficiente para demo |
| Detector de cara | ML Kit Face Detection (fast mode) | On-device, gratis |
| Umbral de match (coseno) | 0.85 | Ajustable; calibrar con dataset de prueba en `10-testing-strategy.md` |
| Radio de descarga de fichas | 10 km (geohash precision 5) | Cubre el distrito entero con margen |
| Máx fichas comparadas/cliente | 500 | Más que esto → degradación; documentado como límite MVP |

### Notas importantes

- **ML Kit por sí solo no genera embeddings.** Solo detecta y devuelve bounding box + landmarks. El embedding comparable lo produce MobileFaceNet. Esta separación es la fuente más común de confusión en el doc original.
- **El embedding es derivado biométrico.** Aunque no es la imagen, legalmente requiere consentimiento (ver `07-security-privacy.md`).
- **El cliente, no el servidor, decide el match.** El servidor solo notifica. Esto reduce drásticamente el riesgo de filtración biométrica.
- **Calibración del umbral:** se documenta el procedimiento en `10-testing-strategy.md` con un set de 20 pares positivos y 20 negativos sintéticos.
