// Espejo de crafting/04-data-model.md. Fuente de verdad para tipos del cliente.
import type { Timestamp, GeoPoint } from "firebase/firestore";

export type Zone = "zapallal" | "la_ensenada" | "huamantanga" | "centro" | "otros";
export type Role = "citizen" | "operator";

export type Priority = "P1" | "P2" | "P3";
export type ReportType = "panic" | "text";
export type ReportStatus = "received" | "attending" | "closed" | "dismissed";
export type NotificationKind = "report_status" | "nearby_p1" | "missing_match";

export interface UserDoc {
  displayName: string;
  email?: string;
  zone: Zone | null;
  role: Role;
  geohash?: string;
  lastLocation?: GeoPoint;
  expoPushTokens: string[];
  consentLocation: boolean;
  consentBiometric: boolean;
  onboardingDone: boolean;
  createdAt: Timestamp;
}

export interface ReportDoc {
  authorUid: string;
  type: ReportType;
  text?: string;
  location: GeoPoint;
  geohash: string;
  priority?: Priority;
  priorityReason?: string;
  status: ReportStatus;
  attendedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MissingPersonDoc {
  registrantUid: string;
  name: string;
  age: number;
  description: string;
  lastSeenZone: Zone;
  lastSeenLocation?: GeoPoint;
  lastSeenGeohash: string;
  photoUrl: string;
  embedding: number[] | null;
  active: boolean;
  createdAt: Timestamp;
  closedAt: Timestamp | null;
}

export interface SightingDoc {
  reporterUid: string;
  photoUrl: string;
  embedding: number[];
  location: GeoPoint;
  geohash: string;
  matchedMissingId: string | null;
  similarity?: number;
  createdAt: Timestamp;
}

export interface NotificationDoc {
  recipientUid: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  readAt: Timestamp | null;
  createdAt: Timestamp;
}
