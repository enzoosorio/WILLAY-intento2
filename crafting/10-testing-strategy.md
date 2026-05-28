# 10 — Estrategia de testing

Tres niveles, ajustados al scope MVP. Nada de testing exhaustivo de producción; sí, suficiente para defender la fase en clase.

## Niveles

| Nivel | Qué prueba | Herramientas |
|---|---|---|
| Unit | Funciones puras: reglas de triaje, parsers, helpers de geohash, distancia coseno | `pytest` (functions), `flutter_test` (Flutter) |
| Reglas Firestore | Cada permiso/denegación documentado en `04-data-model.md` | `@firebase/rules-unit-testing` |
| Integración local | Triggers + Firestore + Storage en emulador | Firebase Emulator Suite |
| E2E manual de demo | Flujos completos en dos dispositivos | Checklist en `crafting/demo-checklist.md` (se crea en F5) |

No usamos integration tests de Flutter contra Firebase real para no consumir cuota; todo contra emulador.

## Casos críticos por fase

### F1 — Auth
- Usuario sin completar onboarding NO puede crear reports (regla).
- Usuario sin `consentBiometric=true` NO puede crear missing_persons.

### F2 — Pánico
- `type=panic` recibe `priority=P1` siempre.
- Long-press <2s NO dispara.
- Geohash de Lima Norte cubre exactamente las 9 celdas esperadas (test con coords conocidas).
- Push llega al dispositivo suscrito; NO llega al no suscrito.

### F3 — Triaje
- Reglas: matriz 15×3 (5 frases por categoría, 3 categorías clave).
- Gemini fallback: si timeout → P3; si JSON inválido → P3.
- Operador NO puede transicionar `closed → received` (failed-precondition).

### F4 — Visión
- **Dataset de calibración** (interno, hecho con compañeros con consentimiento):
  - 20 pares positivos (mismo rostro, distinta foto/iluminación).
  - 20 pares negativos (rostros distintos).
- Métrica objetivo: con umbral 0.85, FAR (false-accept) ≤10%, FRR (false-reject) ≤20%.
- Si no se cumple, ajustar umbral y registrar en `crafting/threshold-calibration.md`.
- Avistamiento sin match: confirmar via Storage console que la foto NO existe.

## Datos de prueba

- `tools/seed_demo.py`: puebla Firestore emulador con:
  - 3 usuarios (2 citizen, 1 operator).
  - 5 reports (mix P1/P2/P3).
  - 3 missing_persons activos.
- `tools/load_threshold_set.py`: carga los 40 pares de calibración.

## Métricas a reportar en la demo final

| Métrica | Cómo se mide |
|---|---|
| Latencia pánico → notif operador (warm) | Cloud Function loggea `t_start` y `t_fanout_done`; cliente operador loggea `t_received` |
| % reportes clasificados sin Gemini | Contar `usedGemini=false / total` en `reports` de la demo |
| Latencia comparación facial on-device | Cliente loggea `t_compare_start/end` por sighting |
| Coverage de reglas Firestore | Salida de `firebase emulators:exec` con `--coverage` |

## Lo que NO testeamos (declarado)

- Performance con 10k usuarios concurrentes.
- Seguridad: pen-test, fuzzing, SQLi (no aplica), XSS.
- Compatibilidad iOS (si el equipo no tiene Mac, se documenta como limitación).
- Accesibilidad WCAG.
