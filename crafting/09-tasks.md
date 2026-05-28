# 09 — Tareas y subtareas

Cada minitarea declara: **owner** (BE = Enzo, FE = compañeros, AMBOS), **DoD** y referencia a HU/RF.

Notación: `[BE]`, `[FE]`, `[AMBOS]`.

---

## F0 — Scaffold

### T0.1 Inicializar proyecto Firebase `[BE]`
- Crear proyecto Firebase `willay-dev`.
- Activar: Firestore (modo nativo, región `southamerica-east1`), Storage, Authentication (Google), Functions 2nd gen, Hosting.
- **DoD:** consola muestra los servicios activos; CLI conectada.

### T0.2 Instalar dependencias Expo `[FE]`
- `cd app && npm install` instala todas las deps de `package.json`.
- Copiar `app/.env.example` → `app/.env` y rellenar las 4 variables desde Firebase Console.
- `npx expo start` — confirmar que la app abre en Expo Go mostrando "🟢 Willay listo".
- **DoD:** pantalla "Willay listo — Fase 0 Scaffold completado" visible en dispositivo o emulador Android vía Expo Go.

### T0.3 Scaffold de funciones Python `[BE]`
- `firebase init functions` con runtime Python 3.11.
- Función `panicEcho` (health-check) desplegada.
- **DoD:** `curl` a la URL devuelve 200.

### T0.4 Reglas base de Firestore + emulador `[BE]`
- `firestore.rules` con auth obligatoria en todas las colecciones.
- `firestore.indexes.json` con los 4 índices declarados en `04-data-model.md`.
- Suite de pruebas con `@firebase/rules-unit-testing`.
- **DoD:** `firebase emulators:exec "npm test"` pasa.

### T0.5 CI GitHub Actions `[BE]`
- Workflow: lint Flutter (`dart analyze`), test reglas, validate `firebase.json`.
- **DoD:** PR muestra checks verdes.

---

## F1 — Auth + perfil

### T1.1 Pantalla Sign-In con Google `[FE]`
- Botón "Continuar con Google" usando `google_sign_in` + `firebase_auth`.
- **DoD:** tras login, ruta `/onboarding` se abre.

### T1.2 Cloud Function `onUserCreated` `[BE]`
- Trigger `auth.user().onCreate`: crea doc en `users/{uid}` con `role=citizen` y campos vacíos.
- **DoD:** test en emulador: registrar usuario → doc existe.

### T1.3 Onboarding: zona + consentimientos `[FE]`
- Dropdown de 5 zonas + 2 checkboxes (ubicación, biometría).
- Escribe `zone`, `consentBiometric` en `users/{uid}`.
- **DoD:** sin aceptar consentimiento de ubicación, botón pánico aparece deshabilitado.

### T1.4 Política de privacidad `[BE]`
- `privacy.md` en repo + pantalla scrollable en la app.
- **DoD:** link visible en onboarding y en perfil.

### T1.5 Operador manual `[BE]`
- Script `tools/make_operator.py` que setea `role=operator` para un uid dado.
- **DoD:** ejecutar script y verificar en Firestore.

---

## F2 — Botón de pánico

### T2.1 Captura de ubicación + geohash `[FE]`
- Helper `LocationService.currentWithHash()` usando `geolocator` + `geoflutterfire_plus`.
- **DoD:** unit test con coords conocidas devuelve geohash esperado.

### T2.2 UI botón de pánico (long-press 2s) `[FE]`
- Press largo 2s; vibración de confirmación; muestra "Alerta enviada".
- **DoD:** test widget verifica que tap corto NO dispara.

### T2.3 Escritura de `reports` tipo `panic` `[FE]`
- Crea doc con `type=panic`, `location`, `geohash`, `authorUid`, `createdAt`.
- **DoD:** doc visible en consola con campos correctos.

### T2.4 Trigger `onReportCreate` rama panic `[BE]`
- Si `type=panic`: setea `priority=P1`, `priorityReason="panic:default_P1"`.
- Invoca `fanoutPanic` con el geohash.
- **DoD:** test emulador: crear doc → tras <1s, priority=P1.

### T2.5 Función `fanoutPanic` `[BE]`
- Calcula 9 geohashes (propio + 8 vecinos) precision 6.
- Publica a topics FCM `panic_<geohash>`.
- **DoD:** test envía a topic mock; verifica payload.

### T2.6 Suscripción FCM por geohash `[FE]`
- Al actualizar ubicación, suscribir a `panic_<geohash6>` y desuscribir del anterior.
- **DoD:** logs FCM muestran suscripción.

### T2.7 UI recepción de push P1 cercano `[FE]`
- Notificación con título "Alerta P1 cerca de ti" + zona aproximada (sin coords exactas).
- **DoD:** demo con dos teléfonos: push llega <8s (cold) / <3s (warm).

### T2.8 Vista mínima del operador `[FE]`
- Lista `reports where status=received order by createdAt desc`.
- Tap → ficha con mapa + botones atender/descartar.
- **DoD:** operador ve la alerta dentro de 5s tras pánico.

---

## F3 — Triaje de texto

### T3.1 UI redacción de reporte `[FE]`
- TextField con contador 280 chars + botón enviar.
- **DoD:** envío crea `reports` con `type=text`.

### T3.2 Implementar `classifyText` (reglas) `[BE]`
- Diccionario en `functions/classifier/rules.py` según `06-ml-pipeline.md`.
- Función pura testeable.
- **DoD:** 15 unit tests cubren todas las categorías y el caso `low_signal`.

### T3.3 Implementar fallback Gemini `[BE]`
- Cliente `google-generativeai` con `gemini-1.5-flash`.
- Parser estricto JSON + timeout 4s + fallback P3.
- API key en Secret Manager.
- **DoD:** test con 3 inputs ambiguos devuelve P válido.

### T3.4 Wiring en `onReportCreate` rama texto `[BE]`
- Si reglas devuelven `confidence>=0.8` → usa esa; si no → Gemini.
- Escribe `priority`, `priorityReason`, marca `usedGemini` para métricas.
- **DoD:** test integración: 5 reportes mixtos clasificados como esperado.

### T3.5 Bandeja del operador filtrada `[FE]`
- Tabs: "P1/P2 activas" (default), "Todas".
- Ordenamiento por priority asc, createdAt desc.
- **DoD:** P3 no aparece en tab default.

### T3.6 `markReportStatus` callable `[BE]`
- Valida rol operador + transiciones permitidas.
- **DoD:** test rechaza transición inválida con `failed-precondition`.

### T3.7 Estado del reporte para el ciudadano `[FE]`
- Pantalla "mis reportes" con estados; suscripción a snapshot.
- Push al ciudadano cuando status cambia.
- **DoD:** demo: operador marca atendiendo → ciudadano recibe push.

---

## F4 — Fichas + visión

### T4.1 Integrar ML Kit Face Detection `[FE]`
- Paquete `google_mlkit_face_detection`, modo `fast`.
- Helper que recibe imagen y devuelve crop de cara más grande.
- **DoD:** test con foto de prueba devuelve bbox no nulo.

### T4.2 Integrar MobileFaceNet TFLite `[FE]`
- Modelo `.tflite` en `assets/models/`.
- Wrapper que recibe crop → tensor → embedding 192-d.
- **DoD:** dos fotos de la misma persona → coseno >0.7; fotos distintas → <0.5.

### T4.3 UI crear ficha `[FE]`
- Form: foto, nombre, edad, descripción, zona, ubicación última.
- Genera embedding al subir.
- **DoD:** ficha aparece en feed comunitario al instante.

### T4.4 Subir foto a Storage + escribir `missing_persons` `[FE]`
- Foto: `gs://.../missing/{personId}.jpg`.
- Doc con embedding inline.
- **DoD:** regla Storage permite solo al registrant escribir esa ruta.

### T4.5 UI capturar avistamiento `[FE]`
- Cámara → detect → embed → descarga fichas activas en geohash± → compara.
- Si match (coseno≥0.85): sube foto + doc con `matchedMissingId`.
- Si no match: descarta sin subir nada.
- **DoD:** prueba con persona en ficha → match; con desconocido → no sube.

### T4.6 Trigger `onSightingCreate` `[BE]`
- Si `matchedMissingId`: crea `notifications` para el registrant + envía FCM directo.
- **DoD:** test: crear sighting con match → registrant recibe push.

### T4.7 `cleanupSightings` scheduled `[BE]`
- Cada 1h: borra sightings sin match >24h + sus fotos.
- **DoD:** test fake-clock: doc viejo desaparece, doc reciente persiste.

### T4.8 Cerrar ficha encontrada `[FE]`
- Botón "Persona encontrada" en ficha propia → setea `active=false`, `embedding=null`, `closedAt`.
- **DoD:** ficha ya no aparece en descargas posteriores.

---

## F5 — Pulido y entrega

### T5.1 Script de demo `[AMBOS]`
- Guion de 7 minutos cubriendo F1→F4.
- **DoD:** ensayo cronometrado.

### T5.2 Medición de métricas reales `[BE]`
- Cloud Function loggea timestamps; script `tools/measure.py` agrega.
- **DoD:** tabla con valores reales en `crafting/metrics-final.md`.

### T5.3 README final + arquitectura visual `[BE]`
- Diagrama exportado como PNG en `docs/`.
- **DoD:** README enlaza a `crafting/` y muestra el diagrama.

### T5.4 NDAs simbólicas y consentimientos firmados `[AMBOS]`
- PDFs firmados por compañeros que actúen como operadores.
- **DoD:** carpeta `legal/demo/` con archivos.

---

## Convenciones de DoD generales

Toda tarea, además de su DoD específico, cumple:
- Código en una rama `feat/<id-tarea>`.
- PR con descripción que cita HU/RF cubiertos.
- Test correspondiente verde (ver `10-testing-strategy.md`).
- Lint y typecheck verdes.
- Sin secretos en el diff.

