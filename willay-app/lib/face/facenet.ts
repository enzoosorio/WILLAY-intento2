// FacenetEmbedder — usa TensorFlow.js + un modelo MobileFaceNet/FaceNet en
// formato tfjs-graph. Carga TODO con require() dinámico para que la app no
// arrastre ~10MB de tfjs si USE_FACENET=false.
//
// REQUISITOS para activarlo:
//   USE_FACENET=true en .env
//   npx expo install @tensorflow/tfjs @tensorflow/tfjs-react-native \
//                    expo-gl expo-asset
//   Colocar el modelo en assets/models/facenet/model.json (+ shards .bin)
//   Construir un dev build:  npx eas build --profile development --platform android
//   (tfjs-react-native NO funciona en Expo Go por dependencias nativas de GL.)
//
// Si falta cualquiera de los requisitos, este embedder lanza un Error
// descriptivo y el caller (withFallback en index.ts) cae al MockEmbedder.
//
// Inferencia IMPLEMENTADA: resize 112×112 → decodeJpeg → normalizar [-1,1]
// → model.predict → L2-normalizar → number[192]. Ver assets/models/facenet/README.md
// para obtener/convertir el modelo MobileFaceNet a formato tfjs-graph.
//
// El modelo se carga por URL (FACENET_MODEL_URL) con tf.loadGraphModel, NO con
// require() de los archivos — así el bundle no se acopla a binarios que pueden
// no existir (el modo mock debe seguir compilando en Expo Go).

import { env } from "@/lib/env";
import type { FaceEmbedder } from "./types";

const DIM = 192;
const INPUT_SIZE = 112; // MobileFaceNet espera 112×112×3

let _ready: Promise<unknown> | null = null;
let _model: unknown = null;
let _tf: typeof import("@tensorflow/tfjs") | null = null;
let _decodeJpeg: ((bytes: Uint8Array, channels?: number) => unknown) | null = null;

async function load() {
  if (_ready) return _ready;
  _ready = (async () => {
    try {
      // Dynamic imports — fallan limpiamente si los paquetes no están.

      const url = env.facenetModelUrl;
      if (!url) throw new Error("FACENET_MODEL_URL no configurada");

      _tf = require("@tensorflow/tfjs") as typeof import("@tensorflow/tfjs");

      require("@tensorflow/tfjs-react-native");

      const { decodeJpeg } = require("@tensorflow/tfjs-react-native") as {
        decodeJpeg: (bytes: Uint8Array, channels?: number) => unknown;
      };
      _decodeJpeg = decodeJpeg;
      await _tf.ready();
      // Carga por URL: model.json + shards alojados en una URL pública.
      _model = await _tf.loadGraphModel(url);
    } catch (e) {
      _ready = null;
      throw new Error(
        `[facenet] no se pudo cargar el modelo o sus deps: ${(e as Error).message}. ` +
          `Confirma @tensorflow/tfjs + tfjs-react-native + expo-gl instalados y ` +
          `FACENET_MODEL_URL apuntando al model.json tfjs.`,
      );
    }
  })();
  return _ready;
}

export const FacenetEmbedder: FaceEmbedder = {
  name: "facenet-mobilefacenet",
  dim: DIM,
  async embed(uri: string): Promise<number[]> {
    await load();
    const tf = _tf;
    if (!tf || !_model || !_decodeJpeg) throw new Error("[facenet] modelo no inicializado");

    // 1. Redimensionar a 112×112 con expo-image-manipulator y obtener bytes JPEG.
    const ImageManipulator = require("expo-image-manipulator") as typeof import("expo-image-manipulator");
    const FileSystem = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    const base64 = manipulated.base64;
    if (!base64) throw new Error("[facenet] no se pudo leer la imagen redimensionada");

    // base64 → Uint8Array de bytes JPEG.
    const raw = (FileSystem as unknown as { decode?: (b: string) => Uint8Array }).decode
      ? (FileSystem as unknown as { decode: (b: string) => Uint8Array }).decode(base64)
      : Uint8Array.from(globalThis.atob(base64), (c) => c.charCodeAt(0));

    // 2-4. Inferencia dentro de tf.tidy para liberar tensores intermedios.
    const embedding = tf.tidy(() => {
      // decodeJpeg → [112,112,3] uint8
      const decoded = _decodeJpeg!(raw, 3) as import("@tensorflow/tfjs").Tensor3D;
      // normalizar a [-1, 1]
      const normalized = decoded.toFloat().sub(127.5).div(127.5);
      // [1,112,112,3]
      const batched = normalized.expandDims(0);
      const out = (_model as import("@tensorflow/tfjs").GraphModel).predict(batched) as
        | import("@tensorflow/tfjs").Tensor
        | import("@tensorflow/tfjs").Tensor[];
      const tensor = Array.isArray(out) ? out[0] : out;
      // L2-normalizar el embedding (coherente con cosineSimilarity).
      const norm = tensor.div(tensor.norm());
      return norm.dataSync();
    });

    const vec = Array.from(embedding);
    if (vec.length !== DIM) {
      console.warn(`[facenet] el modelo devolvió ${vec.length} dims (se esperaban ${DIM})`);
    }
    return vec;
  },
};
