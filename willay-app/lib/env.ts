// Acceso tipado a la config en Constants.expoConfig.extra (resuelta desde
// process.env en app.config.ts). Cualquier acceso a env vars pasa por acá.
import Constants from "expo-constants";
import { Platform } from "react-native";

type FirebaseExtra = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};
type Extra = {
  firebase: FirebaseExtra;
  region: string;
  useEmulators: string;
  emulatorHost: string;
  useFacenet: string;
  faceBackend: string; // "onnx" | "facenet" | "mock"
  faceRemoteUrl: string; // callable/HTTP endpoint remoto para embeddings
  faceModelUrl: string; // URL del .onnx (backend onnx)
  facenetModelUrl: string; // URL del model.json tfjs (backend facenet)
  eas: { projectId: string };
};

export type FaceBackend = "remote" | "onnx" | "facenet" | "mock";

const raw = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const env = {
  firebase: raw.firebase ?? ({} as FirebaseExtra),
  region: raw.region || "southamerica-east1",
  useEmulators: raw.useEmulators === "true",
  // Android emu: 10.0.2.2 mapea al localhost del host. iOS sim/web: localhost OK.
  emulatorHost:
    raw.emulatorHost && raw.emulatorHost !== "localhost"
      ? raw.emulatorHost
      : Platform.OS === "android"
        ? "10.0.2.2"
        : "localhost",
  useFacenet: raw.useFacenet === "true",
  // Backend de visión facial. FACE_BACKEND manda; si no está, se infiere de
  // USE_FACENET por compatibilidad; default "mock" (corre en Expo Go).
  faceBackend: ((): FaceBackend => {
    const b = (raw.faceBackend || "").toLowerCase();
    if (b === "remote" || b === "onnx" || b === "facenet" || b === "mock") return b;
    return raw.useFacenet === "true" ? "facenet" : "mock";
  })(),
  faceRemoteUrl: raw.faceRemoteUrl || "",
  faceModelUrl: raw.faceModelUrl || "",
  facenetModelUrl: raw.facenetModelUrl || "",
  easProjectId: raw.eas?.projectId || "",
} as const;
