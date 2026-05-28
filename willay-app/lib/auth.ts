// Auth con Google Sign-In via expo-auth-session.
//
// Fallback: si los clientIds no están configurados (o estamos en emulador y
// el usuario no quiere setear OAuth real), provee signInDev() que crea un
// usuario anónimo en el emulador Auth — útil para iterar sin OAuth.

import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { env, hasGoogleAuth } from "./env";
import { getFirebaseAuth } from "./firebase";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: env.googleAuth.webClientId,
    iosClientId: env.googleAuth.iosClientId,
    androidClientId: env.googleAuth.androidClientId,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params["id_token"];
      if (idToken) {
        const cred = GoogleAuthProvider.credential(idToken);
        signInWithCredential(getFirebaseAuth(), cred).catch((e) =>
          console.error("[auth] signInWithCredential", e),
        );
      }
    }
  }, [response]);

  return {
    /** true cuando hay clientIds configurados Y el AuthRequest está listo. */
    ready: hasGoogleAuth() && !!request,
    /** true si no hay clientIds — la UI puede mostrar un placeholder. */
    needsClientIds: !hasGoogleAuth(),
    signIn: () => promptAsync(),
  };
}

/** Login anónimo en emulador (atajo de desarrollo cuando no hay OAuth listo). */
export function signInDev(): Promise<User> {
  return signInAnonymously(getFirebaseAuth()).then((c) => c.user);
}

export const signOut = (): Promise<void> => fbSignOut(getFirebaseAuth());

export function onAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}
