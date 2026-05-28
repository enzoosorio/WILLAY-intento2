// Factory: elige el embedder según USE_FACENET. Si FaceNet falla en runtime
// (modelo no instalado, deps faltantes), degradamos automáticamente al mock
// y logueamos — la demo nunca se rompe por eso.

import { env } from "@/lib/env";
import { MATCH_THRESHOLD, type FaceEmbedder } from "./types";
import { MockEmbedder } from "./mock";
import { FacenetEmbedder } from "./facenet";

let cached: FaceEmbedder | null = null;

export function getFaceEmbedder(): FaceEmbedder {
  if (cached) return cached;
  if (env.useFacenet) {
    cached = withFallback(FacenetEmbedder, MockEmbedder);
  } else {
    cached = MockEmbedder;
  }
  console.log(`[face] backend activo: ${cached.name}`);
  return cached;
}

export function getMatchThreshold(): number {
  return env.useFacenet ? MATCH_THRESHOLD.facenet : MATCH_THRESHOLD.mock;
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
