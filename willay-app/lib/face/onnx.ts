// OnnxEmbedder — reconocimiento facial REAL on-device con ONNX Runtime.
//
// Usa `onnxruntime-react-native` (módulo nativo) para correr un modelo de
// embedding facial (ArcFace o MobileFaceNet) exportado a .onnx. El preprocesado
// de la imagen (decodificar JPEG → píxeles RGB) se hace con `jpeg-js` (JS puro),
// así que no dependemos de ningún decodificador nativo extra.
//
// REQUISITOS para activarlo (no corre en Expo Go — necesita dev build):
//   1. npx expo install onnxruntime-react-native
//      npm install jpeg-js
//   2. FACE_BACKEND=onnx y FACE_MODEL_URL=<url del .onnx> en .env
//   3. Dev build:  npx eas build --profile development --platform android
//
// El modelo se descarga por URL en runtime y se cachea (NO se empaqueta con
// require(), para no acoplar el bundle a un archivo binario que puede no existir;
// así el modo mock sigue compilando en Expo Go).
//
// Si falta cualquier requisito, embed() lanza un Error descriptivo y el caller
// (withFallback en index.ts) cae automáticamente al MockEmbedder.

import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { env } from "@/lib/env";
import type { FaceEmbedder } from "./types";
import { NativeModules} from 'react-native'
// Tipos locales mínimos de onnxruntime-react-native (evita exigir el paquete
// instalado para que el typecheck pase; en runtime se resuelve via require()).
type OrtTensor = { data: ArrayBufferView };
type OrtSession = {
  inputNames: string[];
  outputNames: string[];
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
};
type OrtModule = {
  InferenceSession: { create(path: string): Promise<OrtSession> };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor;
};

// ── Parámetros del modelo ────────────────────────────────────────────────────
// Ajustar según el modelo que descargues. Los defaults sirven para los modelos
// ArcFace/MobileFaceNet de InsightFace (entrada 112×112 RGB, NCHW, [-1,1]).
const INPUT_SIZE = 112; // ancho = alto esperado por el modelo
const LAYOUT: "NCHW" | "NHWC" = "NCHW"; // ArcFace/MobileFaceNet usan NCHW
const MEAN = 127.5; // normalización: (pixel - MEAN) / STD
const STD = 127.5; // → rango [-1, 1]
const NOMINAL_DIM = 512; // ArcFace=512, MobileFaceNet típico=128/192 (informativo)

let _session: OrtSession | null = null;
let _ort: OrtModule | null = null;

// Descarga el .onnx (una vez) a la caché y devuelve la ruta local.
async function ensureModelFile(url: string): Promise<string> {
  const dest = `${FileSystem.cacheDirectory}arcface-model.onnx`;
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists && info.size && info.size > 0) return dest;
  const res = await FileSystem.downloadAsync(url, dest);
  if (res.status !== 200) throw new Error(`descarga del modelo falló (HTTP ${res.status})`);
  return dest;
}

async function load() {
  if (_session) return;
    console.log("===== ONNX DEBUG =====");
  console.log("NativeModules.Onnxruntime =", NativeModules.Onnxruntime);
  console.log(
    "NativeModules keys =",
    Object.keys(NativeModules)
  );
  console.log("======================");
  
  try {
    const url = env.faceModelUrl;
    if (!url) throw new Error("FACE_MODEL_URL no configurada");
    _ort = require("onnxruntime-react-native") as OrtModule;
    const path = await ensureModelFile(url);
    _session = await _ort.InferenceSession.create(path.replace("file://", ""));
  } catch (e) {
    _session = null;
    throw new Error(
      `[onnx] no se pudo cargar el modelo o sus deps: ${(e as Error).message}. ` +
        `Confirma onnxruntime-react-native + jpeg-js instalados, FACE_MODEL_URL ` +
        `apuntando a un .onnx, y que corres en un dev build (no Expo Go).`,
    );
  }
}

// jpeg-js no trae tipos propios; declaramos lo mínimo que usamos.
type JpegDecoded = { data: Uint8Array; width: number; height: number };
type JpegModule = { decode: (b: Uint8Array, opts?: { useTArray?: boolean }) => JpegDecoded };

// Decodifica el JPEG (base64) a un Float32Array listo para el modelo.
function preprocess(base64: string): Float32Array {
  // jpeg-js: JS puro, sin dependencias nativas.
  const jpeg = require("jpeg-js") as JpegModule;
  const bytes = Uint8Array.from(globalThis.atob(base64), (c) => c.charCodeAt(0));
  const { data, width, height } = jpeg.decode(bytes, { useTArray: true }); // RGBA
  if (width !== INPUT_SIZE || height !== INPUT_SIZE) {
    // No debería pasar: ya redimensionamos antes. Defensa por si acaso.
    console.warn(`[onnx] imagen ${width}×${height}, se esperaba ${INPUT_SIZE}²`);
  }

  const n = INPUT_SIZE * INPUT_SIZE;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = (data[i * 4] - MEAN) / STD;
    const g = (data[i * 4 + 1] - MEAN) / STD;
    const b = (data[i * 4 + 2] - MEAN) / STD;
    if (LAYOUT === "NCHW") {
      out[i] = r; // canal R
      out[n + i] = g; // canal G
      out[2 * n + i] = b; // canal B
    } else {
      out[i * 3] = r;
      out[i * 3 + 1] = g;
      out[i * 3 + 2] = b;
    }
  }
  return out;
}

function l2normalize(vec: Float32Array): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}

export const OnnxEmbedder: FaceEmbedder = {
  name: "onnx-arcface",
  dim: NOMINAL_DIM,
  async embed(uri: string): Promise<number[]> {
    await load();
    if (!_session || !_ort) throw new Error("[onnx] sesión no inicializada");

    // 1. Redimensionar a 112×112 y obtener base64 JPEG.
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!manipulated.base64) throw new Error("[onnx] no se pudo leer la imagen");

    // 2. Preprocesar → tensor de entrada.
    const input = preprocess(manipulated.base64);
    const dims = LAYOUT === "NCHW"
      ? [1, 3, INPUT_SIZE, INPUT_SIZE]
      : [1, INPUT_SIZE, INPUT_SIZE, 3];

    const session = _session;
    const inputName = session.inputNames[0]!;
    const tensor = new _ort.Tensor("float32", input, dims);

    // 3. Inferencia.
    const results = await session.run({ [inputName]: tensor });
    const output = results[session.outputNames[0]!]!;
    const raw = output.data as Float32Array;

    // 4. L2-normalizar (coherente con cosineSimilarity en types.ts).
    return l2normalize(raw);
  },
};
