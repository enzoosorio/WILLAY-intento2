// Contrato común para los dos backends de visión facial.
// Si querés añadir un tercero (Cloud Vision, react-native-fast-tflite, etc.)
// implementá esta interface y registrálo en index.ts.

export interface FaceEmbedder {
  /** Nombre identificable — se loguea para saber qué backend corrió. */
  readonly name: string;
  /** Dimensión del embedding devuelto (64 mock, 192 FaceNet). */
  readonly dim: number;
  /** Convierte un imageUri (file://… o data:…) a un vector float[]. */
  embed(imageUri: string): Promise<number[]>;
}

/** Similitud coseno entre dos vectores de la misma dimensión. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Umbral de match por backend.
 * - remote: usa el mismo umbral del modelo ONNX remoto.
 * - onnx (ArcFace): 0.40 es el punto de partida típico para coseno con embeddings
 *   L2-normalizados de InsightFace; CALIBRAR con el set de 20+20 pares (Fase 5).
 * - facenet (MobileFaceNet tfjs): 0.85 según ADR-004.
 * - mock: 0.92 (más estricto porque el hash de contenido está muy correlacionado).
 */
export const MATCH_THRESHOLD = { remote: 0.25, onnx: 0.4, facenet: 0.85, mock: 0.92 } as const;
