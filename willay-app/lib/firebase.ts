// Singleton de Firebase (modular SDK v11) con wiring de emuladores.
//
// Notas críticas (no remover):
//  1. Auth en RN: usar initializeAuth + getReactNativePersistence(AsyncStorage)
//     o la sesión se pierde al reabrir la app. En web, getAuth() basta.
//  2. Los emuladores deben conectarse ANTES del primer uso. Por eso este módulo
//     es idempotente y se importa muy temprano (en _layout.tsx).
//  3. Region: `southamerica-east1` definida en un solo lugar (env.region).

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  connectAuthEmulator,
  // @ts-expect-error — getReactNativePersistence existe en runtime; no se
  // exporta en .d.ts (es API "interna" pero documentada). Patrón oficial.
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { env } from "./env";

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;
let _functions: Functions | undefined;

function ensureApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(env.firebase);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = ensureApp();
  _auth =
    Platform.OS === "web"
      ? getAuth(app)
      : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  if (env.useEmulators) {
    connectAuthEmulator(_auth, `http://${env.emulatorHost}:9099`, { disableWarnings: true });
  }
  return _auth;
}

export function getDb(): Firestore {
  if (_db) return _db;
  _db = initializeFirestore(ensureApp(), { experimentalAutoDetectLongPolling: true });
  if (env.useEmulators) connectFirestoreEmulator(_db, env.emulatorHost, 8080);
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(ensureApp());
  if (env.useEmulators) connectStorageEmulator(_storage, env.emulatorHost, 9199);
  return _storage;
}

export function getFirebaseFunctions(): Functions {
  if (_functions) return _functions;
  _functions = getFunctions(ensureApp(), env.region);
  if (env.useEmulators) connectFunctionsEmulator(_functions, env.emulatorHost, 5001);
  return _functions;
}

/** Inicializa todos los singletons. Llamar una vez en el root layout. */
export function bootstrapFirebase(): void {
  getFirebaseAuth();
  getDb();
  getFirebaseStorage();
  getFirebaseFunctions();
}
