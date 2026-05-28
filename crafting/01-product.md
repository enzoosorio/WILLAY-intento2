# 01 — Producto

## Visión

Willay es una plataforma móvil que convierte a los vecinos de Puente Piedra en una red activa de vigilancia, priorizando emergencias reales mediante IA y reduciendo la latencia de respuesta dentro de la "hora dorada".

## Scope del MVP universitario

El MVP es un **prototipo demostrable en aula** con datos sintéticos y un grupo reducido de usuarios reales (compañeros, familia, ~30 cuentas). No es producción.

### En scope (debe funcionar end-to-end en la demo)

1. **Registro** con Google Sign-In y selección de zona.
2. **Botón de pánico** que envía ubicación a Firestore y dispara push a vecinos cercanos.
3. **Reporte por texto** (≤280 chars) clasificado P1/P2/P3 por reglas locales con fallback a Gemini.
4. **Ficha de persona desaparecida** (foto + datos básicos) visible en feed.
5. **Avistamiento facial:** subir foto, extraer embedding on-device, comparar contra fichas activas, notificar al familiar si hay match.
6. **Vista de operador** (mismo app, rol distinto): bandeja P1/P2 con mapa y acciones atender/descartar.
7. **Estado del reporte** visible para el ciudadano: Recibido → En atención → Cerrado.
8. **Notificación push** a vecinos en radio 500m para alertas P1 confirmadas.

### Fuera de scope (declarado y defendible)

- Integración real con Serenazgo / PNP / sistemas de cámaras municipales.
- Vector DB dedicada (Firestore se usa como almacén de embeddings; comparación en cliente; **se acepta no escalar más allá de ~500 fichas activas**).
- SMS / Phone Auth (costo no cubierto por free tier en Perú).
- Cumplimiento Ley 29733 production-grade (se implementa lo mínimo: consentimiento explícito, política breve, derecho de borrado).
- Auditoría de seguridad formal.
- Moderación humana de fichas.
- Anti-fraude / detección de reportes falsos automatizada.

## Métricas de éxito (demo)

| Métrica | Objetivo demo |
|---|---|
| Tiempo pánico → notificación al operador (warm) | <3s |
| Tiempo pánico → notificación al operador (cold start) | <8s, documentado |
| Latencia comparación facial on-device | <500ms |
| % reportes clasificados sin llamar a Gemini | ≥70% (eficiencia híbrida) |
| Flujo registro completo | <3 minutos |
| Acciones para activar pánico desde app abierta | ≤2 taps |

## No-goals explícitos

- No buscamos reemplazar al serenazgo. Lo modelamos como **canal estructurado complementario**.
- No buscamos precisión policial en el reconocimiento facial. La narrativa es "indicio para que un humano decida", nunca "match certificado".
- No optimizamos para 10.000 usuarios concurrentes. El RNF-05 del doc original se reescribe en `02-architecture.md` como "escalabilidad teórica heredada de Firebase, no validada".

## Usuarios objetivo (resumen)

- **Ricardo** (vecino vigilante) — reporta bajo estrés, necesita ≤3 taps.
- **Milagros** (familiar en crisis) — sube ficha en <2 min, recibe alerta automática si hay avistamiento.
- **Operador de Serenazgo** — bandeja filtrada P1/P2, sin ruido, mismo app con rol diferente.

Detalle en `Willay.md` §2.2 (arquetipos).
