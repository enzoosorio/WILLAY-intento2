# 11 — Glosario

Términos del dominio Willay. Si un concepto aparece en otro doc sin definir, debería estar aquí.

| Término | Definición |
|---|---|
| **Hora dorada** | Periodo de ~60 minutos tras un incidente (delito o desaparición) en que la probabilidad de resolución es máxima. Justifica el énfasis en latencia. |
| **P1 / P2 / P3** | Niveles de prioridad asignados a los reportes. P1 = vida en riesgo inmediato; P2 = delito en curso/reciente sin riesgo vital; P3 = sospecha, observación, ambiguo. |
| **Triaje híbrido** | Pipeline de clasificación de texto que aplica reglas locales primero y solo invoca Gemini si la confianza de las reglas es baja. |
| **Embedding facial** | Vector numérico (192 floats en MobileFaceNet) que representa características de un rostro. Permite comparar caras por distancia coseno sin manejar la imagen. |
| **MobileFaceNet** | Red neuronal ligera para extracción de embeddings faciales. Corre on-device vía TensorFlow Lite. |
| **ML Kit Face Detection** | SDK de Google que detecta caras y landmarks en una imagen. **No genera embeddings**; se usa solo para recortar la cara antes de pasarla a MobileFaceNet. |
| **Similitud coseno** | Métrica para comparar dos embeddings. Rango [-1, 1]; valores ≥0.85 se consideran match en este proyecto. |
| **Geohash** | Codificación de coordenadas como string. Precision 6 ≈ celda de 1.2km × 600m, usada para queries por radio en Firestore. |
| **FCM** | Firebase Cloud Messaging. Servicio de push notifications de Google. |
| **Topic FCM** | Canal de FCM al que los dispositivos se suscriben. Permite fan-out sin manejar listas de tokens. Willay usa topics `panic_<geohash6>`. |
| **Cold start** | Primer disparo de una Cloud Function tras inactividad; tarda 5–8s extra. En Willay se acepta como trade-off y se mitiga con un "warm-up" antes de la demo. |
| **Callable Function** | Cloud Function invocada explícitamente por el cliente vía SDK Firebase, con auth incluida automáticamente. Equivale a un endpoint RPC. |
| **Trigger** | Cloud Function disparada por un evento (creación de doc, login, scheduler) sin invocación explícita del cliente. |
| **Reglas de Firestore** | Lenguaje declarativo de autorización en Firebase. En Willay son la **única** barrera de autorización (no hay backend proxy). |
| **Ficha (de persona desaparecida)** | Documento en `missing_persons` con foto, datos básicos y embedding facial. |
| **Avistamiento** | Reporte de un vecino que cree haber visto a una persona buscada. Documento en `sightings`. |
| **Match** | Coincidencia entre el embedding de un avistamiento y el de una ficha, con coseno ≥0.85. |
| **Bandeja del operador** | Vista en la app (con `role=operator`) que lista reports P1/P2 activos, ordenados por prioridad. |
| **Hora dorada digital** | Re-uso del término del dominio para describir la ventana en que Willay puede reducir la latencia comunitaria (objetivo: minutos → segundos). |
| **DoD (Definition of Done)** | Criterio explícito para considerar una tarea cerrada. Se declara en `09-tasks.md` por tarea. |
| **ADR (Architecture Decision Record)** | Registro breve de una decisión técnica con contexto, alternativas y consecuencias. Viven en `03-tech-decisions.md`. |
| **Scope MVP universitario** | Alcance acotado a una demo en aula con datos sintéticos y ~30 usuarios reales. No es producción. |
| **Ley 29733** | Ley peruana de protección de datos personales. Marco legal aplicable. |
| **ANPDP** | Autoridad Nacional de Protección de Datos Personales del Perú. |
