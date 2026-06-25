# Modelo facial — ArcFace / MobileFaceNet (ONNX)

`lib/face/onnx.ts` (backend `FACE_BACKEND=onnx`) carga el modelo **por URL** en
runtime (`FACE_MODEL_URL`), lo descarga una vez y lo cachea en el dispositivo.

> **¿Por qué por URL y no `require()` de un archivo local?** Metro resuelve los
> `require()` en tiempo de bundling aunque estén dentro de funciones; si el `.onnx`
> no existe, **rompe el bundle entero** (incluso el modo mock en Expo Go). Cargar
> por URL desacopla el bundle del binario.

Esta carpeta queda solo como documentación (el modelo no se versiona aquí).

## Qué modelo descargar

Cualquier modelo de **embedding facial** en formato `.onnx` con entrada de imagen.
Recomendados (gratis, pesos abiertos):

- **MobileFaceNet** (~1–5 MB, el más liviano — ideal para gama baja, encaja con la
  narrativa del proyecto). Buscar en Hugging Face / GitHub: `mobilefacenet onnx`.
- **ArcFace / InsightFace `w600k_mbf` o `buffalo_s`** (MobileNet backbone, liviano)
  o `arcfaceresnet100` (más pesado, 512-d, más preciso). Repo: InsightFace ModelZoo.

> Referencia de apps Expo que ya traen un ArcFace .onnx listo para copiar:
> https://github.com/maateusx/react-native-expo-facial-recognition
> https://github.com/DhouiouiCharfeddine/react-native-expo-facial-recognition

Súbelo a una URL pública (GitHub Releases / raw, Hugging Face, o cualquier hosting
de archivos) y apunta `FACE_MODEL_URL` a esa URL del `.onnx`.

## Ajustar parámetros si tu modelo difiere

En `lib/face/onnx.ts` (constantes al inicio):

| Constante | Default | Cuándo cambiarla |
|---|---|---|
| `INPUT_SIZE` | 112 | si el modelo espera 96/128 |
| `LAYOUT` | `NCHW` | si el modelo es NHWC |
| `MEAN` / `STD` | 127.5 / 127.5 | si normaliza distinto (ej. 0/255) |

La dimensión de salida (128/192/512) se detecta sola; no hay que tocarla.

## Activar en la app

1. Instala las dependencias (ya en package.json):
   ```bash
   npx expo install onnxruntime-react-native jpeg-js
   ```
2. En `.env`:
   ```
   FACE_BACKEND=onnx
   FACE_MODEL_URL=https://.../tu-modelo.onnx
   ```
3. **Dev build EAS** (no corre en Expo Go — ONNX Runtime es nativo):
   ```bash
   npx eas build --profile development --platform android
   ```
   Instala el APK resultante en un Android y corre `npx expo start` como siempre.
4. En `scan.tsx` el log debe decir
   `[face] backend activo: onnx-arcface|fallback:mock-content-hash`.

## ⚠ Importante: regenerar las fichas

Los embeddings de las fichas deben venir del **mismo modelo**. Las fichas viejas
(creadas con el mock, 64-d) **no comparan** con vectores ONNX. Crea las fichas de
demo **desde la app** (`missing/new.tsx`) con `FACE_BACKEND=onnx` activo, para que
sus embeddings los produzca este modelo.

## Calibración (Design Thinking — Fase 5)

Con 20 pares positivos + 20 negativos, mide la similitud coseno y ajusta
`MATCH_THRESHOLD.onnx` en `lib/face/types.ts` (parte de 0.40). Vuelca la tabla
TP/FP/TN/FN en `crafting/metrics-final.md`.
