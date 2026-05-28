# 07 — Seguridad y privacidad

Alcance: **mínimo legal demostrable** para defensa académica. No es un programa de compliance real.

## Marco aplicable

- **Ley N° 29733 — Protección de Datos Personales (Perú).** Aplica a: nombre, foto, ubicación, embeddings faciales (derivados biométricos).
- **Reglamento Ley 29733 (DS 003-2013-JUS).**

## Datos personales tratados y base legal

| Dato | Sensibilidad | Base legal MVP |
|---|---|---|
| Email + nombre Google | Personal estándar | Consentimiento al registro |
| Zona del distrito | Personal | Consentimiento |
| Ubicación GPS (reportes/pánico) | Personal | Consentimiento + interés vital (emergencia) |
| Foto de ficha de desaparecido | Personal del tercero | Consentimiento del registrante declarando vínculo |
| Embedding facial | **Sensible (derivado biométrico)** | Consentimiento explícito separado |
| Foto de avistamiento | Personal del tercero | Consentimiento del reportante; **eliminada si no hay match** |

## Medidas técnicas

### En tránsito
- TLS 1.3 (heredado de Firebase / Google).
- Tokens FCM no se envían a otros usuarios; el fan-out usa topics, no listas.

### En reposo
- Firestore cifrado por defecto.
- Cloud Storage cifrado por defecto.
- Embeddings se guardan como `array<float>` (sin imagen asociada en el caso de avistamientos sin match).

### Acceso
- Reglas de Firestore como única autorización. Resumen:
  - `users/{uid}`: lectura propia y del operador; escritura propia (campos limitados).
  - `reports`: cualquier autenticado puede crear; lectura amplia; `priority`/`status` solo Cloud Functions u operador.
  - `missing_persons`: lectura para autenticados; escritura/cierre solo del `registrantUid`.
  - `sightings`: creación de cualquier autenticado; lectura solo del `reporterUid` y del registrante de la ficha matched.
  - `notifications`: lectura solo del `recipientUid`.

### Retención
- `sightings` sin match: borrado a 24h (Cloud Function programada).
- `missing_persons` cerrados: marcados `active=false`; el embedding se anula (`embedding=null`) al cerrar la ficha.
- Cuenta eliminada por el usuario: cascada manual via Cloud Function (`deleteUserData`) que borra users/{uid}, sus reports, fichas y sightings.

## Medidas organizativas (declarativas para la demo)

- Pantalla de **consentimiento granular** al registro: dos checkboxes separados:
  - "Acepto el uso de mi ubicación para alertas y reportes."
  - "Acepto que la app procese características faciales (embeddings) on-device y las suba al servidor solo cuando registre o reporte un avistamiento. Puedo retirarlo eliminando mis fichas."
- **Política de privacidad breve** (`privacy.md` en la app, ~1 página, lenguaje claro).
- Documento de **rol y responsabilidad** para los operadores demo (NDA simbólico firmado por compañeros que actúen como operadores).

## Riesgos conocidos y mitigación

| Riesgo | Mitigación MVP |
|---|---|
| Falso match facial expone a inocente | Match es "indicio", no acción policial. UI dice "posible coincidencia, verifique". |
| Reporte malicioso (denuncia falsa) | Rate-limit por uid (1 reporte cada 30s vía rules); auditoría manual en demo. |
| Filtración de fichas activas | Solo autenticados pueden leer; no hay endpoint público. |
| Operador ve datos personales | Lista de operadores cerrada y declarada; rol en Firestore `users.role`. |
| Cold start expone ventana sin clasificación | El reporte queda en estado `received` hasta que la función calienta; el operador lo ve igual, solo sin priority. |

## Qué NO está cubierto (declarado)

- Anonimización avanzada (k-anonymity de geohashes).
- Logs de auditoría inmutables.
- DPIA (Evaluación de impacto en protección de datos) formal.
- Registro del banco de datos personales ante la ANPDP.
- Borrado garantizado en backups (los backups de Firebase no permiten edición selectiva).

Estos puntos quedan en el roadmap como deuda explícita.
