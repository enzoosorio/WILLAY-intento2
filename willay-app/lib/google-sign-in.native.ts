// Implementación NATIVA de Google Sign-In.
// Este archivo se usa automáticamente en Android e iOS (builds nativos).
// En Expo Go Metro carga google-sign-in.ts (el stub) en su lugar.

import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

import { env } from "./env";
import { getFirebaseAuth } from "./firebase";

/** Llamar UNA vez al arrancar la app (en _layout.tsx). */
export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    // webClientId: el OAuth web client que usa Firebase para verificar el token.
    webClientId: env.googleAuth.webClientId,
    // iosClientId: opcional, mejora el flujo en iOS.
    ...(env.googleAuth.iosClientId ? { iosClientId: env.googleAuth.iosClientId } : {}),
  });
}

/**
 * Inicia el flujo nativo de Google Sign-In y autentica en Firebase.
 * Lanza Error si el usuario cancela o hay un error de red/plataforma.
 */
export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const result = await GoogleSignin.signIn();

  if (result.type === "cancelled") {
    throw Object.assign(new Error("cancelled"), { code: "CANCELLED" });
  }

  const idToken = result.data?.idToken;
  if (!idToken) throw new Error("Google Sign-In no devolvió un ID token.");

  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(getFirebaseAuth(), credential);
}

/** true en builds nativos, false en Expo Go / web. */
export const isNativeGoogleSignInAvailable = true;
