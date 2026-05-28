# 03 — Decisiones técnicas (ADRs)

Formato corto. Cada ADR: contexto, opciones consideradas, decisión, consecuencias.

---

## ADR-001 — Expo (React Native) como cliente único  *(actualizado — Flutter descartado)*

**Contexto:** necesitamos app Android + iOS + vista de operador.
**Opciones evaluadas:**
- A: Flutter — descartado. Requiere instalar el SDK Dart (~2 GB) y Dart es desconocido para el equipo.
- B: **Expo (React Native)** — elegido. TypeScript, ecosistema npm familiar, Expo Go para iteración rápida sin build nativo en F0–F3.
- C: React Native bare — más control pero sin las ventajas de Expo (CLI, OTA, plugins).

**Decisión:** B — Expo SDK 52 con Expo Router (file-based routing).

**Consecuencias:**
- Firebase JS SDK (no Admin) en el cliente. Todas las llamadas a Firestore van contra Security Rules.
- Auth: `expo-auth-session` + Google Sign-In funciona en Expo Go. No requiere build nativo para F0–F3.
- ML Kit / TFLite en F4: los paquetes `expo-camera` + `@tensorflow/tfjs-react-native` funcionan en managed workflow. Si se necesita rendimiento nativo mayor, se escala a **Expo Dev Build** (`eas build --profile development`), no a Flutter.
- Vista de operador: misma app, rol `operator`. No se requiere app separada.

---

## ADR-002 — Firebase como backend

**Contexto:** scope MVP, costo cercano a cero, sin DevOps.
**Opciones:**
- A: Firebase completo (Firestore + Functions + Storage + FCM + Auth).
- B: Supabase (Postgres + Edge Functions).
- C: AWS Amplify.
**Decisión:** A.
**Consecuencias:** lock-in. Geoqueries no nativas (mitigado con geohash). Firestore no es vector DB (aceptado en ADR-005).

---

## ADR-003 — Cloud Functions 2nd gen Python, sin min-instance

**Contexto:** la lógica de triaje y fan-out cabe en funciones cortas; Python facilita librerías de ML si llegaran a necesitarse en servidor.
**Opciones:**
- A: Cloud Functions 2g Python, sin min-instance.
- B: Cloud Functions 2g con `min_instances=1` (warm permanente).
- C: FastAPI en Cloud Run.
**Decisión:** A.
**Consecuencias:** primer disparo del día sufre cold start de 5–8s (medido aproximado). Para la demo en clase se "calienta" la función 30s antes de mostrar. Documentado en `01-product.md` métricas.
**Trade-off explícito:** rompe el RNF-01 literal del doc original; se reformula en `02-architecture.md`.

---

## ADR-004 — Visión facial on-device (ML Kit detect + MobileFaceNet TFLite embed)

**Contexto:** se necesita reconocimiento facial sin enviar biometría cruda a servidor.
**Opciones:**
- A: ML Kit Face Detection (recorte) + MobileFaceNet TFLite (embedding 192-d) on-device.
- B: Cloud Vision / Vertex AI Face en backend.
- C: Solo hash perceptual de imagen.
**Decisión:** A.
**Consecuencias:**
- Sin biometría cruda en servidor → mejor postura Ley 29733.
- Solo vectores numéricos viajan a Firestore (técnicamente derivados biométricos; se trata con consentimiento explícito).
- Calidad demostrativa, no policial. La narrativa del proyecto refleja esto.
- ML Kit por sí solo **no genera embeddings comparables**; sirve para detectar y recortar la cara antes de pasarla a MobileFaceNet. Esta separación se documenta en `06-ml-pipeline.md`.

---

## ADR-005 — Comparación de embeddings en cliente, sin vector DB

**Contexto:** Firestore no soporta búsqueda por similitud.
**Opciones:**
- A: Cliente descarga fichas activas en radio (≤500), compara local por coseno.
- B: Vertex AI Matching Engine.
- C: Cloud Function con FAISS / sklearn cargando todas las fichas en memoria.
**Decisión:** A.
**Consecuencias:** no escala >~500 fichas activas. Aceptado por scope MVP. Documentado como limitación.

---

## ADR-006 — Triaje de texto híbrido: reglas → Gemini fallback

**Contexto:** Gemini cuesta por request y agrega latencia de red; muchos reportes son clasificables con keywords.
**Opciones:**
- A: Reglas locales primero (keywords + heurísticas), Gemini solo si confianza baja.
- B: Gemini siempre.
- C: Solo reglas determinísticas.
**Decisión:** A.
**Consecuencias:** ~70% de reportes clasificados sin red; el 30% restante se envía a Gemini con prompt estructurado (ver `06-ml-pipeline.md`). Mejor narrativa académica ("hybrid AI") y menor costo.

---

## ADR-007 — Auth: Google Sign-In en MVP, Phone Auth como v1.1

**Contexto:** Phone Auth en Perú no está en free tier (~$0.05/SMS).
**Opciones:**
- A: Google Sign-In en MVP, Phone Auth diferido.
- B: Phone Auth desde el inicio (presupuesto limitado).
- C: Ambos al mismo tiempo.
**Decisión:** A.
**Consecuencias:** pierdes el discurso de "cualquier celular con SMS"; lo recuperamos textualmente en el roadmap (`08-roadmap.md`).

---

## ADR-008 — Geohashing para queries por radio en Firestore

**Contexto:** Firestore Geopoints solo almacena; no consulta por radio.
**Opciones:**
- A: Geohash precision 6 + lib `geoflutterfire_plus`.
- B: PostGIS aparte (Cloud SQL).
- C: Subcollections por celda fija (cuadrícula manual).
**Decisión:** A.
**Consecuencias:** se mantiene un campo `geohash` redundante en docs con ubicación. Ligero overhead pero simple.

---

## ADR-009 — FCM por topics geohash, no por lista de tokens

**Contexto:** para fan-out 500m necesitamos un mecanismo escalable.
**Opciones:**
- A: Topics FCM por geohash (cliente se suscribe a su celda + 8 vecinas).
- B: Cloud Function consulta usuarios en radio y envía a tokens individuales.
- C: Lista distribuida en colección y envío batch.
**Decisión:** A.
**Consecuencias:** push llega a celda ~1.2km en vez de exactamente 500m. Aceptable para demo y reduce coste/complejidad drásticamente.

---

## ADR-010 — Reglas de Firestore como única barrera de autorización

**Contexto:** sin backend proxy, las reglas son la frontera.
**Decisión:** las reglas se versionan en `firestore.rules`, se prueban con el emulador y se incluyen como artefacto de entrega.
**Consecuencias:** lectura/escritura siempre pasa por reglas explícitas; ningún campo "confiable" lo escribe el cliente (priority, status: solo Cloud Functions). Ver `04-data-model.md` y `07-security-privacy.md`.
