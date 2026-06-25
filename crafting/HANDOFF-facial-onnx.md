# Handoff — Reconocimiento facial ONNX (lo que falta)

Nota para retomar la tarea del modelo facial en un chat aparte. La **integración de
código ya está hecha**; falta conseguir el modelo, hostearlo y probar.

## Estado actual (hecho)

- `willay-app/lib/face/onnx.ts` — `OnnxEmbedder` real con `onnxruntime-react-native`:
  resize 112×112 → decodifica JPEG (`jpeg-js`) → tensor → modelo → embedding L2.
  **Carga el modelo por URL** (`FACE_MODEL_URL`), lo descarga y cachea. Sin `require()`
  del binario (eso rompía el bundle de Metro).
- `willay-app/lib/face/index.ts` — selector `FACE_BACKEND` (`mock`|`onnx`|`facenet`)
  con `withFallback` al mock (la demo nunca se rompe).
- `app/missing/scan.tsx` ya consume `getFaceEmbedder().embed()`. No tocar.
- Deps instaladas: `onnxruntime-react-native`, `jpeg-js`. Plugin en `app.json`.
- Umbrales en `lib/face/types.ts`: `{ onnx: 0.40, facenet: 0.85, mock: 0.92 }`.
- Parámetros ajustables al inicio de `onnx.ts`: `INPUT_SIZE=112`, `LAYOUT="NCHW"`,
  `MEAN=127.5`, `STD=127.5` (defaults InsightFace/ArcFace).
- El bundle compila limpio en modo mock (Expo Go) — verificado con `expo export`.

## Lo que falta (pasos)

1. **Elegir modelo** `.onnx` (entrada cara ~112×112×3, salida embedding 128/192/512).
   Candidatos: `huggingface.co/garavv/arcface-onnx`, `huggingface.co/py-feat/mobilefacenet`,
   `huggingface.co/fal/AuraFace-v1`. **Inspeccionar forma entrada/salida** (netron.app o
   pkg python `onnx`) y ajustar `INPUT_SIZE/LAYOUT/MEAN/STD` si difiere.
2. **Subir el `.onnx` a GitHub Releases** del repo → obtener URL de descarga directa.
3. **Cablear** `.env`: `FACE_BACKEND=onnx`, `FACE_MODEL_URL=<url>`.
4. **Dev build**: `eas build --profile development --platform android` → instalar APK en
   Android físico → verificar log `[face] backend activo: onnx-arcface|fallback:mock-content-hash`.
5. **Probar + calibrar**: crear fichas **desde la app** (no con el seed; el embedding debe
   venir del mismo modelo), correr avistamientos, calibrar `MATCH_THRESHOLD.onnx` con 20
   pares positivos + 20 negativos → tabla en `crafting/metrics-final.md` (evidencia Fase 5).

## Restricciones clave

- Backend `onnx` **no corre en Expo Go** → requiere dev build EAS (nube, sin Android Studio).
- Mientras tanto, `FACE_BACKEND=mock` sigue corriendo en Expo Go.
- Modelo por URL (no empaquetado) para no acoplar el bundle al binario.
