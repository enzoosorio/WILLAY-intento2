// Hooks de sesión: usuario de Auth + documento users/{uid} de Firestore.
// La pantalla raíz usa esto para decidir si mandar a sign-in, onboarding o tabs.
import { useEffect, useState } from "react";
import { onSnapshot, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

import { onAuth } from "./auth";
import { userDoc } from "./collections";
import type { UserDoc } from "@/types/models";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  useEffect(() => onAuth((u) => setState({ user: u, loading: false })), []);
  return state;
}

export interface UserDocState {
  data: UserDoc | null;
  loading: boolean;
}

export function useUserDoc(uid: string | null | undefined): UserDocState {
  const [state, setState] = useState<UserDocState>({ data: null, loading: true });
  useEffect(() => {
    if (!uid) {
      setState({ data: null, loading: false });
      return;
    }
    const ref = userDoc(uid);
    const unsub = onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? (snap.data() as UserDoc) : null, loading: false }),
      (err) => {
        console.warn("[session] onSnapshot error", err);
        setState({ data: null, loading: false });
      },
    );
    return unsub;
  }, [uid]);
  return state;
}

/**
 * Crea el doc users/{uid} si no existe (T1.2 client-side).
 * Idempotente — se llama tras cada login.
 */
export async function ensureUserDoc(user: User): Promise<void> {
  const ref = userDoc(user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    displayName: user.displayName ?? user.email ?? "Sin nombre",
    email: user.email ?? undefined,
    zone: null,
    role: "citizen",
    expoPushTokens: [],
    consentLocation: false,
    consentBiometric: false,
    onboardingDone: false,
    createdAt: serverTimestamp(),
  } as never);
}
