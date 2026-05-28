// Capa dinámica encima de app.json: resuelve $VAR contra process.env (vía dotenv)
// y mantiene los demás campos sin tocar. Permite versionar app.json + .env.example
// sin commitear secretos en .env.
import "dotenv/config";
import type { ExpoConfig } from "expo/config";

function resolve(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("$") && value.length > 1) {
    return process.env[value.slice(1)] ?? "";
  }
  if (Array.isArray(value)) return value.map(resolve);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, resolve(v)]),
    );
  }
  return value;
}

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const merged: ExpoConfig = {
    ...config,
    extra: resolve({
      ...(config.extra ?? {}),
      firebase: {
        apiKey: "$FIREBASE_API_KEY",
        authDomain: "$FIREBASE_AUTH_DOMAIN",
        projectId: "$FIREBASE_PROJECT_ID",
        storageBucket: "$FIREBASE_STORAGE_BUCKET",
        messagingSenderId: "$FIREBASE_MESSAGING_SENDER_ID",
        appId: "$FIREBASE_APP_ID",
      },
      googleAuth: {
        webClientId: "$GOOGLE_WEB_CLIENT_ID",
        iosClientId: "$GOOGLE_IOS_CLIENT_ID",
        androidClientId: "$GOOGLE_ANDROID_CLIENT_ID",
      },
      region: "southamerica-east1",
      useEmulators: "$USE_EMULATORS",
      emulatorHost: "$EMULATOR_HOST",
      useFacenet: "$USE_FACENET",
      eas: { projectId: "$EAS_PROJECT_ID" },
    }) as Record<string, unknown>,
  };
  return merged;
};
