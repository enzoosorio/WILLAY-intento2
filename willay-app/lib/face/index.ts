// Factory: elige el embedder según FACE_BACKEND.
//   "remote"  → RemoteFaceEmbedder (backend remoto con ONNX)
//   "onnx"    → OnnxEmbedder (ArcFace/MobileFaceNet real, dev build)  ← Opción A
//   "facenet" → FacenetEmbedder (MobileFaceNet vía tfjs)              ← Opción B
//   "mock"    → MockEmbedder (hash de contenido, corre en Expo Go)    ← fallback
//
// Cualquier backend real se envuelve en withFallback: si falla en runtime
// (modelo no instalado, deps faltantes, corriendo en Expo Go), degrada al mock
// y loguea — la demo nunca se rompe por eso.

import { env } from "@/lib/env";
import { MATCH_THRESHOLD, type FaceEmbedder } from "./types";
import { MockEmbedder } from "./mock";
import { RemoteFaceEmbedder } from "./remote";
import { OnnxEmbedder } from "./onnx";
// NOTA: el backend "facenet" (Opción B, tfjs) NO se importa para no arrastrar
// @tensorflow/tfjs-react-native al bundle. Para habilitarlo: instala esa dep e
// importa FacenetEmbedder aquí (ver lib/face/facenet.ts).

let cached: FaceEmbedder | null = null;

export function getFaceEmbedder(): FaceEmbedder {
  if (cached) return cached;
  switch (env.faceBackend) {
    case "remote":
      cached = withFallback(RemoteFaceEmbedder, MockEmbedder);
      break;
    case "onnx":
      cached = withFallback(OnnxEmbedder, MockEmbedder);
      break;
    case "facenet":
      console.warn('[face] backend "facenet" no está enlazado; usando mock. Ver lib/face/index.ts.');
      cached = MockEmbedder;
      break;
    default:
      cached = MockEmbedder;
  }
  console.log(`[face] backend activo: ${cached.name}`);
  return cached;
}

export function getMatchThreshold(): number {
  switch (env.faceBackend) {
    case "remote":
      return MATCH_THRESHOLD.onnx;
    case "onnx":
      return MATCH_THRESHOLD.onnx;
    case "facenet":
      return MATCH_THRESHOLD.facenet;
    default:
      return MATCH_THRESHOLD.mock;
  }
}

function withFallback(primary: FaceEmbedder, fallback: FaceEmbedder): FaceEmbedder {
  return {
    name: `${primary.name}|fallback:${fallback.name}`,
    dim: primary.dim,
    async embed(uri: string) {
      try {
        return await primary.embed(uri);
      } catch (e) {
        console.warn(`[face] ${primary.name} falló, usando ${fallback.name}:`, (e as Error).message);
        return fallback.embed(uri);
      }
    },
  };
}

export { cosineSimilarity, MATCH_THRESHOLD } from "./types";
export type { FaceEmbedder } from "./types";
