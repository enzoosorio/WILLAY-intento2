// MockEmbedder — "embedding" demostrativo basado en el CONTENIDO de la imagen.
//
// NO es reconocimiento facial real. Pero a diferencia de la versión por-URI,
// esta lee el contenido real del archivo (base64) y genera el vector de ahí,
// así la MISMA foto produce SIEMPRE el mismo embedding aunque su URI cambie
// entre selecciones (Expo copia las imágenes de galería a rutas temporales
// distintas cada vez).
//
// Para reconocimiento REAL se reemplaza por FacenetEmbedder (USE_FACENET=true)
// en un development build con el modelo entrenado.

import * as FileSystem from "expo-file-system/legacy";
import type { FaceEmbedder } from "./types";

const DIM = 64;

// Lee el archivo como base64 (contenido real de la imagen).
async function readBase64(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    // Si no se puede leer, devolvemos la URI como último recurso.
    return uri;
  }
}

// Genera un vector determinístico de DIM valores a partir del contenido.
// Usamos un hash rodante por posición para que imágenes DISTINTAS produzcan
// vectores claramente distintos (evita falsos positivos), y la MISMA imagen
// produzca exactamente el mismo vector.
function buildVector(content: string): number[] {
  const vec = new Array<number>(DIM).fill(0);

  // Hash acumulativo estilo FNV mezclado con la posición.
  let h = 2166136261;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 16777619);
    // Distribuimos la influencia de cada carácter en un cubo distinto.
    const idx = (h >>> 0) % DIM;
    vec[idx] += (h >>> 8) & 0xff;
  }

  // Normalización L2 (necesaria para la similitud de coseno).
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

export const MockEmbedder: FaceEmbedder = {
  name: "mock-content-hash",
  dim: DIM,
  async embed(uri: string): Promise<number[]> {
    const content = await readBase64(uri);
    return buildVector(content);
  },
};