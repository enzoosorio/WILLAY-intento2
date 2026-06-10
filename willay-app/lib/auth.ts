import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { getFirebaseAuth } from "./firebase";

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return cred.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await updateProfile(cred.user, { displayName });
  return cred.user;
}

export function signInAnonymouslyApp(): Promise<User> {
  return signInAnonymously(getFirebaseAuth()).then((c) => c.user);
}

/** Login anónimo en emulador */
export function signInDev(): Promise<User> {
  return signInAnonymously(getFirebaseAuth()).then((c) => c.user);
}

export const signOut = (): Promise<void> => fbSignOut(getFirebaseAuth());

export function onAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}
