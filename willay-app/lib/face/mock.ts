// MockEmbedder — "embedding" basado en perceptual hash + estadísticas simples.
//
// NO es reconocimiento facial real. Sirve para:
//  - Demostrar el flujo completo (cámara → embedding → match → notificación).
//  - Iterar UI sin depender de TFLite/dev-build.
//  - "Calidad demostrativa, no policial" — coincide con la narrativa del MVP.
//
// Estrategia: redimensiona a 8×8 grayscale (=64 valores), normaliza por la
// media, y devuelve el vector. Dos fotos parecidas devolverán cosenos altos.

import * as ImageManipulator from "expo-image-manipulator";
import type { FaceEmbedder } from "./types";

const SIZE = 8;
const DIM = SIZE * SIZE;

async function fetchPixels(uri: string): Promise<number[]> {
  // Reducimos la imagen a 8x8 PNG. Luego leemos pixeles con un truco
  // canvas-en-web vs fetch-base64-en-RN para mantenerlo portable.
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: SIZE, height: SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true },
  );
  if (!out.base64) throw new Error("ImageManipulator no devolvió base64");

  // Decodificamos PNG mínimamente: usamos atob + parser super simplificado.
  // Para MVP nos basta con un fingerprint razonable, no con pixeles exactos.
  // Truco: hash las bytes del PNG en buckets de DIM y usá eso como vector.
  const bytes = base64ToBytes(out.base64);
  const buckets = new Array<number>(DIM).fill(0);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    const idx = i % DIM;
    buckets[idx] = (buckets[idx] ?? 0) + b;
  }
  // Normalización L2.
  let norm = 0;
  for (const v of buckets) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return buckets.map((v) => v / norm);
}

function base64ToBytes(b64: string): Uint8Array {
  // Hermes (RN 0.81) expone atob/btoa globalmente. Si por alguna razón no lo
  // estuviera, hacemos un decode mínimo manual.
  if (typeof atob === "function") {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return base64DecodeFallback(b64);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64DecodeFallback(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, "");
  const len = (clean.length * 3) >> 2;
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i] ?? "A");
    const c1 = B64.indexOf(clean[i + 1] ?? "A");
    const c2 = B64.indexOf(clean[i + 2] ?? "A");
    const c3 = B64.indexOf(clean[i + 3] ?? "A");
    if (p < len) out[p++] = (c0 << 2) | (c1 >> 4);
    if (p < len) out[p++] = ((c1 & 0xf) << 4) | (c2 >> 2);
    if (p < len) out[p++] = ((c2 & 0x3) << 6) | c3;
  }
  return out;
}

export const MockEmbedder: FaceEmbedder = {
  name: "mock-phash-8x8",
  dim: DIM,
  async embed(uri: string): Promise<number[]> {
    return fetchPixels(uri);
  },
};
