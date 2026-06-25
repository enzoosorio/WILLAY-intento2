import { env } from "@/lib/env";
import * as FileSystem from "expo-file-system/legacy";
import type { FaceEmbedder } from "./types";

const DEFAULT_DIM = 512;

function fileToBase64(uri: string): string {
  return uri.startsWith("data:") ? uri.split(",")[1] ?? "" : "";
}

async function uriToBase64(uri: string): Promise<string> {
  const direct = fileToBase64(uri);
  if (direct) return direct;
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.error || data?.message || data?.detail || text || `HTTP ${response.status}`;
    throw new Error(`[remote-face] ${response.status} ${message}`);
  }
  return data;
}

function resolveEmbedUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/$/, "");
  return `${clean}/embed`;
}

export const RemoteFaceEmbedder: FaceEmbedder = {
  name: "remote-face",
  dim: DEFAULT_DIM,
  async embed(imageUri: string): Promise<number[]> {
    if (!env.faceRemoteUrl) throw new Error("FACE_REMOTE_URL no configurada");

    const imageBase64 = await uriToBase64(imageUri);
    const data = await postJson(resolveEmbedUrl(env.faceRemoteUrl), {
      imageBase64,
      mimeType: "image/jpeg",
      client: "willay-app",
    });

    const embedding = Array.isArray(data?.data?.[0]?.embedding)
      ? data.data[0].embedding
      : Array.isArray(data?.embedding)
        ? data.embedding
        : null;
    if (!embedding || embedding.length === 0) {
      throw new Error("respuesta inválida del backend remoto");
    }

    console.log("[remote-face] embedding", {
      dim: embedding.length,
      first: Number(embedding[0] ?? 0).toFixed(6),
      meanAbs: (embedding.reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0) / embedding.length).toFixed(6),
    });

    return embedding.map((value: unknown) => Number(value));
  },
};
