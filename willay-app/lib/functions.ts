// Wrappers tipados de las Callable Functions (ver crafting/05-api-contracts.md).
import { httpsCallable, type HttpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebase";
import type { Priority, ReportStatus } from "@/types/models";

// ─── classify_text ────────────────────────────────────────────────────────
export interface ClassifyTextInput {
  text: string;
}
export interface ClassifyTextOutput {
  priority: Priority;
  reason: string;
  usedGemini: boolean;
}
export const classifyText = (): HttpsCallable<ClassifyTextInput, ClassifyTextOutput> =>
  httpsCallable(getFirebaseFunctions(), "classify_text");

// ─── panic_echo ───────────────────────────────────────────────────────────
export interface PanicEchoOutput {
  ok: boolean;
  warm: boolean;
  ts: string;
}
export const panicEcho = (): HttpsCallable<Record<string, never>, PanicEchoOutput> =>
  httpsCallable(getFirebaseFunctions(), "panic_echo");

// ─── summarize_user_reports ───────────────────────────────────────────────
export interface SummarizeReportsInput {
  authorUid: string;
}
export interface SummarizeReportsOutput {
  summary: string;
  count: number;
  usedGemini: boolean;
}
export const summarizeUserReports = (): HttpsCallable<SummarizeReportsInput, SummarizeReportsOutput> =>
  httpsCallable(getFirebaseFunctions(), "summarize_user_reports");
export interface MarkReportStatusInput {
  reportId: string;
  status: Extract<ReportStatus, "attending" | "closed" | "dismissed">;
}
export interface MarkReportStatusOutput {
  ok: boolean;
}
export const markReportStatus = (): HttpsCallable<MarkReportStatusInput, MarkReportStatusOutput> =>
  httpsCallable(getFirebaseFunctions(), "mark_report_status");