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
// descriptivo y el caller debe caer al MockEmbedder.

import type { FaceEmbedder } from "./types";

const DIM = 192;

let _ready: Promise<unknown> | null = null;
let _model: unknown = null;
let _tf: typeof import("@tensorflow/tfjs") | null = null;

async function load() {
  if (_ready) return _ready;
  _ready = (async () => {
    try {
      // Dynamic imports — fallan limpiamente si los paquetes no están.

      _tf = require("@tensorflow/tfjs") as typeof import("@tensorflow/tfjs");

      require("@tensorflow/tfjs-react-native");

      const { bundleResourceIO } = require("@tensorflow/tfjs-react-native") as {
        bundleResourceIO: (json: unknown, weights: unknown) => unknown;
      };
      await _tf.ready();
      // El usuario debe proveer estos assets — los require()s son resueltos
      // por Metro en build-time.

      const modelJson = require("../../assets/models/facenet/model.json");

      const modelWeights = require("../../assets/models/facenet/group1-shard1of1.bin");
      _model = await _tf.loadGraphModel(bundleResourceIO(modelJson, modelWeights) as never);
    } catch (e) {
      _ready = null;
      throw new Error(
        `[facenet] no se pudo cargar el modelo o sus deps: ${(e as Error).message}. ` +
          `Confirma que instalaste @tensorflow/tfjs + tfjs-react-native + expo-gl y que ` +
          `colocaste el modelo en assets/models/facenet/.`,
      );
    }
  })();
  return _ready;
}

export const FacenetEmbedder: FaceEmbedder = {
  name: "facenet-mobilefacenet",
  dim: DIM,
  async embed(_uri: string): Promise<number[]> {
    await load();
    if (!_tf || !_model) throw new Error("[facenet] modelo no inicializado");
    // TODO: cuando integres el modelo real:
    //   1. decodeJpeg(uri) → tensor [H,W,3]
    //   2. tf.image.resizeBilinear(t, [112, 112])
    //   3. normalizar a [-1, 1]
    //   4. expandDims, model.predict, dataSync → number[192]
    throw new Error(
      "[facenet] inferencia no implementada. Ver TODO en lib/face/facenet.ts. " +
        "Para la demo, dejar USE_FACENET=false (mock).",
    );
  },
};
