# Modelo facial — MobileFaceNet (tfjs-graph)

`lib/face/facenet.ts` carga el modelo desde esta carpeta:

```
assets/models/facenet/model.json
assets/models/facenet/group1-shard1of1.bin
```

Estos archivos **no están versionados** (son binarios pesados). Para activar el
reconocimiento facial real debes obtenerlos y colocarlos aquí.

## Requisitos del modelo

- **Arquitectura:** MobileFaceNet (o FaceNet liviano).
- **Input:** `[1, 112, 112, 3]`, valores normalizados a `[-1, 1]` (lo hace el código).
- **Output:** embedding de **192-d** (si tu modelo da 128/512-d, ajusta `DIM` en
  `lib/face/facenet.ts` y los embeddings de las fichas en el seed).

## Cómo obtener el modelo

1. Descarga un MobileFaceNet pre-entrenado (TFLite, Keras `.h5` o SavedModel).
2. Conviértelo a tfjs-graph:

   ```bash
   pip install tensorflowjs
   # desde un SavedModel:
   tensorflowjs_converter --input_format=tf_saved_model \
       ./mobilefacenet_saved_model ./assets/models/facenet
   # o desde Keras .h5:
   tensorflowjs_converter --input_format=keras \
       ./mobilefacenet.h5 ./assets/models/facenet
   ```

3. Verifica que se generaron `model.json` + `group1-shard1of1.bin`.

## Activar en la app

1. Instala la dependencia nativa faltante:
   ```bash
   npx expo install @tensorflow/tfjs-react-native
   ```
2. Pon `USE_FACENET=true` en `.env` (leído por `lib/env.ts`).
3. **Dev build EAS** (no funciona en Expo Go — usa GL nativo):
   ```bash
   npx eas build --profile development --platform android
   ```
4. En `scan.tsx` el log debe decir `[face] backend activo: facenet-mobilefacenet|fallback:mock-content-hash`.

## Calibración (Design Thinking — Fase 5)

Con 20 pares positivos y 20 negativos, mide la similitud coseno y ajusta
`MATCH_THRESHOLD.facenet` en `lib/face/types.ts`. Registra la tabla en
`crafting/metrics-final.md`.
