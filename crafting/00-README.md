# Crafting — Willay

Esta carpeta contiene las "leyes" del proyecto: decisiones de producto, arquitectura, datos, IA, seguridad y plan. Son la fuente de verdad sobre la que iteramos. Los markdowns de la raíz (`Willay.md`, `TAS - anterior a willay.md`) son **insumos de brainstorming**, no especificación.

## Cómo leer esta carpeta

| Si quieres entender... | Lee |
|---|---|
| Qué problema resolvemos y para qué scope | `01-product.md` |
| Cómo está armado el sistema | `02-architecture.md` |
| Por qué elegimos cada tecnología | `03-tech-decisions.md` |
| Cómo se ven los datos en Firestore | `04-data-model.md` |
| Contratos de las Cloud Functions | `05-api-contracts.md` |
| Cómo funciona la IA (texto y visión) | `06-ml-pipeline.md` |
| Qué hacemos con datos personales y biometría | `07-security-privacy.md` |
| Plan por fases | `08-roadmap.md` |
| Tareas concretas y criterios de hecho | `09-tasks.md` |
| Cómo probamos cada fase | `10-testing-strategy.md` |
| Términos del dominio | `11-glossary.md` |

## Convenciones

- **Scope:** MVP universitario / prototipo demostrable. No es producción.
- **Idioma:** español en docs, inglés en código e identificadores.
- **ADRs:** todo cambio de tecnología o trade-off se registra como ADR en `03-tech-decisions.md`.
- **DoD (Definition of Done):** cada tarea en `09-tasks.md` declara su DoD antes de empezar.

## Reparto del equipo

- **Enzo (este repo):** arquitectura, backend (Cloud Functions, Firestore, reglas), pipeline IA, integración FCM, contratos.
- **Compañeros:** Flutter app (UI + integración SDK móvil de ML Kit/TFLite + consumo de contratos definidos en `05-api-contracts.md`).

## Estado de las decisiones tomadas (resumen)

1. Visión facial: **ML Kit (detect) + MobileFaceNet TFLite (embedding) on-device**.
2. Triaje de texto: **híbrido reglas locales → Gemini en zona gris**.
3. Backend IA: **Cloud Functions 2nd gen, sin min-instance** (cold starts aceptados como trade-off MVP).
4. Auth: **Google Sign-In** para MVP. Phone Auth queda como v1.1.
