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
type GoogleAuthExtra = {
  webClientId: string;
  iosClientId: string;
  androidClientId: string;
};
type Extra = {
  firebase: FirebaseExtra;
  googleAuth: GoogleAuthExtra;
  region: string;
  useEmulators: string;
  emulatorHost: string;
  useFacenet: string;
  eas: { projectId: string };
};

const raw = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const env = {
  firebase: raw.firebase ?? ({} as FirebaseExtra),
  googleAuth: raw.googleAuth ?? ({ webClientId: "", iosClientId: "", androidClientId: "" } as GoogleAuthExtra),
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
  easProjectId: raw.eas?.projectId || "",
} as const;

export function hasGoogleAuth(): boolean {
  return !!(env.googleAuth.webClientId || env.googleAuth.iosClientId || env.googleAuth.androidClientId);
}
