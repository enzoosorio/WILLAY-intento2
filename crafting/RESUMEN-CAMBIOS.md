# Qué se hizo y por qué — integración de reconocimiento facial real

Este documento es el resumen para el equipo de lo que se agregó en la última iteración del proyecto WILLAY. No es una guía de uso (esa está en `GUIA-PRUEBA-FACIAL.md`), sino la explicación de qué existe ahora, por qué existe, y qué requisito funcional cubre cada parte.

---

## El punto de partida

La app ya tenía una pantalla de "Escanear avistamiento" (`app/missing/scan.tsx`) que tomaba una foto, la comparaba contra fichas de personas desaparecidas, y decidía si había una coincidencia. Pero la comparación era falsa: usaba un hash del contenido del archivo de imagen, no un modelo de IA real. Cualquier foto de la misma persona producía vectores distintos si la imagen era levemente diferente. El sistema era básicamente decorativo.

El objetivo de esta iteración fue conectar un modelo de reconocimiento facial real, que corra directamente en el celular del usuario sin mandar fotos a ningún servidor externo.

---

## Lo que se agregó

### `willay-app/lib/face/onnx.ts` — el núcleo del cambio

Este es el archivo más importante. Implementa el embedder ONNX: toma la foto que el usuario acaba de tomar, la redimensiona a 112×112 píxeles, la pasa por el modelo de IA (MobileFaceNet), y obtiene un vector de 512 números que representa matemáticamente el rostro. Ese vector es el "embedding facial".

Cómo se conecta a los requisitos: esto cubre **RF-05** (comparación facial on-device). La foto nunca sale del celular para ser procesada — toda la inferencia pasa en el dispositivo.

Decisión de diseño: el modelo no viene dentro del APK (eso haría el instalador enorme). En cambio, se descarga una sola vez desde GitHub Releases cuando el usuario usa la función por primera vez, y queda guardado en la caché del celular.

### `willay-app/lib/face/index.ts` — el selector de backend

Este archivo decide qué motor de IA usar según la variable de entorno `FACE_BACKEND`. Los valores posibles son:

- `onnx` → usa el reconocimiento real (solo en dev build, no en Expo Go)
- `mock` → usa el hash de contenido demostrativo (corre en cualquier entorno)
- `facenet` → opción reservada para el backend de TensorFlow.js, documentada pero no activa

La lógica de fallback está acá: si el modelo ONNX falla por cualquier motivo (sin internet al descargar, error en el dispositivo), la app cae automáticamente al modo mock y sigue funcionando. La demo nunca se rompe.

### `willay-app/lib/face/types.ts` — umbrales de coincidencia

Define el umbral numérico que determina cuándo dos vectores son "suficientemente parecidos" para declarar una coincidencia. Para el backend ONNX se fijó en **0.40** como valor de partida, basado en la literatura de InsightFace para MobileFaceNet con similitud de coseno. Este valor se calibrará con las pruebas del compañero.

### `willay-app/lib/env.ts` — acceso tipado a las variables de entorno

Se agregaron dos campos: `faceBackend` (para saber qué motor usar) y `faceModelUrl` (la URL pública del modelo). Toda variable de entorno pasa por este archivo para que el resto del código tenga tipos correctos y no dependa de strings crudos de `process.env`.

### `willay-app/app.json` — plugin nativo de ONNX Runtime

Se agregó `"onnxruntime-react-native"` a la lista de plugins del build. Esto le dice a EAS que incluya la librería nativa de ONNX Runtime en el APK. Sin esto, el módulo nativo no estaría disponible en el dispositivo aunque el paquete esté en `package.json`.

### `willay-app/metro.config.js` — soporte para archivos `.onnx`

Metro (el bundler de React Native) por defecto no sabe qué hacer con archivos binarios de modelos. Se agregó la extensión `.onnx` a la lista de assets reconocidos, por si en el futuro se quisiera empaquetar el modelo directamente en el APK en vez de descargarlo.

### `willay-app/package.json` — dos dependencias nuevas

- **`onnxruntime-react-native`**: la librería nativa que ejecuta el modelo ONNX en el dispositivo.
- **`jpeg-js`**: decodificador de imágenes JPEG en JavaScript puro. El modelo necesita los valores RGB de cada píxel, y jpeg-js extrae esos bytes sin depender de módulos nativos adicionales.

### `willay-app/.env` — configuración activa

```
FACE_BACKEND=onnx
FACE_MODEL_URL=https://github.com/enzoosorio/WILLAY-intento2/releases/download/version/w600k_mbf.onnx
```

Son las dos variables que hacen que todo lo anterior funcione en producción. Sin `FACE_BACKEND=onnx`, la app usaría el modo demo. Sin `FACE_MODEL_URL`, el embedder ONNX no sabría de dónde bajar el modelo.

---

## Lo que está fuera del repo (GitHub Releases)

El modelo en sí — el archivo `w600k_mbf.onnx` — no está en el repositorio porque pesa 13 MB y los archivos binarios grandes no tienen lugar en git. Está hosteado como asset en un GitHub Release del mismo repo:

`https://github.com/enzoosorio/WILLAY-intento2/releases/tag/version`

Es el modelo **MobileFaceNet entrenado por InsightFace sobre WebFace600K** (600 mil identidades). Produce embeddings de 512 dimensiones, espera imágenes de 112×112 píxeles, y fue elegido porque es el modelo más liviano del ecosistema InsightFace que sigue dando buenos resultados en condiciones reales.

---

## Lo que NO cambió

- `app/missing/scan.tsx` — la pantalla de avistamiento no se tocó. Sigue siendo la que llama a `getFaceEmbedder().embed()` y hace la comparación por coseno. Funciona con cualquier backend.
- `app/missing/[id].tsx` — la ficha de persona desaparecida no cambió en su flujo. El embedding que guarda en Firestore ahora es el embedding real del modelo ONNX, no el hash, pero el campo en Firestore es el mismo (`embedding: number[]`).
- Firebase, Firestore, Storage — sin cambios.
- El flujo de reporte de incidentes — sin cambios.

---

## Qué significa esto para la Fase 5 (Testear)

El sistema ahora puede hacer comparaciones faciales reales. Para validarlo necesitamos medir:

- **Pares positivos**: misma persona, fotos distintas → similitud esperada > 0.40
- **Pares negativos**: personas distintas → similitud esperada < 0.40

Los resultados van en `crafting/metrics-final.md` sección 3. La guía para hacer esas pruebas está en `crafting/GUIA-PRUEBA-FACIAL.md`.

El umbral 0.40 es provisional. Dependiendo de los valores que aparezcan en las pruebas, puede ajustarse en `lib/face/types.ts` línea 38 antes de la presentación.
