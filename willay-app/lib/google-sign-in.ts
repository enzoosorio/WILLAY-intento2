// Stub para Expo Go y web.
// Metro resuelve google-sign-in.native.ts en builds nativos;
// este archivo se usa solo cuando NO hay build nativo.

export function configureGoogleSignIn(): void {
  // no-op en Expo Go / web
}

export async function signInWithGoogle(): Promise<void> {
  throw Object.assign(
    new Error("Google Sign-In requiere el build nativo (no Expo Go)."),
    { code: "EXPO_GO_NOT_SUPPORTED" }
  );
}

export const isNativeGoogleSignInAvailable = false;
