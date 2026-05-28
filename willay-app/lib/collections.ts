// Referencias tipadas a las colecciones de Firestore. Único punto de creación
// de refs — si renombramos una colección, se cambia acá.
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  type CollectionReference,
  type DocumentReference,
  type FirestoreDataConverter,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { getDb } from "./firebase";
import type {
  MissingPersonDoc,
  NotificationDoc,
  Priority,
  ReportDoc,
  ReportStatus,
  SightingDoc,
  UserDoc,
} from "@/types/models";

function converter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => data as Record<string, unknown>,
    fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
  };
}

export const usersCol = (): CollectionReference<UserDoc> =>
  collection(getDb(), "users").withConverter(converter<UserDoc>());
export const userDoc = (uid: string): DocumentReference<UserDoc> => doc(usersCol(), uid);

export const reportsCol = (): CollectionReference<ReportDoc> =>
  collection(getDb(), "reports").withConverter(converter<ReportDoc>());
export const reportDoc = (id: string): DocumentReference<ReportDoc> => doc(reportsCol(), id);

export const missingPersonsCol = (): CollectionReference<MissingPersonDoc> =>
  collection(getDb(), "missing_persons").withConverter(converter<MissingPersonDoc>());
export const missingPersonDoc = (id: string): DocumentReference<MissingPersonDoc> =>
  doc(missingPersonsCol(), id);

export const sightingsCol = (): CollectionReference<SightingDoc> =>
  collection(getDb(), "sightings").withConverter(converter<SightingDoc>());
export const sightingDoc = (id: string): DocumentReference<SightingDoc> => doc(sightingsCol(), id);

export const notificationsCol = (): CollectionReference<NotificationDoc> =>
  collection(getDb(), "notifications").withConverter(converter<NotificationDoc>());

// ── Queries comunes ─────────────────────────────────────────────────────────

/**
 * Bandeja del operador: P1/P2 no cerrados, más recientes primero.
 * Firestore admite un único `in` por query, así que filtramos status con `in`
 * y la prioridad se filtra client-side (apenas 100 docs, ok para MVP).
 */
export function activeReportsQuery(): Query<ReportDoc> {
  return query(
    reportsCol(),
    where("status", "in", ["received", "attending"] satisfies ReportStatus[]),
    orderBy("createdAt", "desc"),
    limit(100),
  );
}

/** Filtra P1/P2 client-side a los resultados de activeReportsQuery. */
export function isOperatorRelevant(r: { priority?: Priority; status: ReportStatus }): boolean {
  return r.priority === "P1" || r.priority === "P2";
}

/** Mis reportes (ciudadano). */
export function myReportsQuery(uid: string): Query<ReportDoc> {
  return query(reportsCol(), where("authorUid", "==", uid), orderBy("createdAt", "desc"), limit(50));
}

/** Fichas activas (para feed y para descarga previa a comparación facial). */
export function activeMissingQuery(): Query<MissingPersonDoc> {
  return query(missingPersonsCol(), where("active", "==", true), orderBy("createdAt", "desc"), limit(100));
}
