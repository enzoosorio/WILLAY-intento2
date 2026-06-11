import { useEffect, useState } from "react";
import {
  Alert, FlatList, Pressable, StyleSheet,
  Text, View, ActivityIndicator, TouchableOpacity, Modal,
} from "react-native";
import { onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { activeReportsQuery } from "@/lib/collections";
import { markReportStatus, summarizeUserReports } from "@/lib/functions";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { IncidentType, ReportDoc, ReportStatus } from "@/types/models";

type Row = { id: string; data: ReportDoc };
type Filter = "todos" | "P1" | "P2";

const STATUS_LABEL: Record<string, string> = {
  received:  "Recibido",
  attending: "En atencion",
  closed:    "Cerrado",
  dismissed: "Descartado",
};
const STATUS_COLOR: Record<string, string> = {
  received:  colors.warning,
  attending: colors.brand,
  closed:    colors.success,
  dismissed: colors.textMuted,
};

const INCIDENT_META: Record<IncidentType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  robo:               { label: "Robo",               icon: "card",         color: "#FF5C5C" },
  asalto:             { label: "Asalto",             icon: "alert-circle", color: "#FF8A3D" },
  violencia_familiar: { label: "Violencia familiar", icon: "hand-left",    color: "#E0457B" },
  accidente:          { label: "Accidente / Salud",  icon: "medkit",       color: "#F5A524" },
  persona_sospechosa: { label: "Pers. sospechosa",   icon: "eye",          color: "#8B5CF6" },
  vandalismo:         { label: "Vandalismo",          icon: "flame",        color: "#FF6B35" },
  otro:               { label: "Otro",                icon: "grid",         color: "#A1A8B8" },
};

function priorityColor(p?: string) {
  if (p === "P1") return colors.danger;
  if (p === "P2") return colors.warning;
  return colors.textMuted;
}

export default function Operator() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const router = useRouter();
  const [rows,          setRows]          = useState<Row[]>([]);
  const [filter,        setFilter]        = useState<Filter>("todos");
  const [busyId,        setBusyId]        = useState<string | null>(null);
  const [summaryModal,  setSummaryModal]  = useState(false);
  const [summaryText,   setSummaryText]   = useState("");
  const [summaryLoading,setSummaryLoading]= useState(false);

  useEffect(() => {
    return onSnapshot(activeReportsQuery(), (snap: any) =>
      setRows(snap.docs.map((d: QueryDocumentSnapshot<ReportDoc>) => ({ id: d.id, data: d.data() })))
    );
  }, []);

  if (!loading && profile && profile.role !== "operator") {
    return <Redirect href="/(tabs)" />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const filtered = rows.filter((r) => filter === "todos" || r.data.priority === filter);
  const countP1  = rows.filter((r) => r.data.priority === "P1").length;
  const countP2  = rows.filter((r) => r.data.priority === "P2").length;

  async function changeStatus(id: string, status: Extract<ReportStatus, "attending" | "closed" | "dismissed">) {
    setBusyId(id);
    try {
      await markReportStatus()({ reportId: id, status });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSummarize(authorUid: string) {
    setSummaryLoading(true);
    setSummaryModal(true);
    setSummaryText("");
    try {
      const res = await summarizeUserReports()({ authorUid });
      setSummaryText(res.data.summary);
    } catch {
      setSummaryText("No se pudo generar el resumen. Intenta de nuevo.");
    } finally {
      setSummaryLoading(false);
    }
  }

  const reportsByUser = rows.reduce((acc, r) => {
    const uid = r.data.authorUid;
    if (!uid) return acc;
    acc[uid] = (acc[uid] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const repeatedReporters = Object.entries(reportsByUser).filter(([, count]) => count >= 3);

  return (
    <Screen padded={false}>
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Panel de Control</Text>
            <Text style={styles.headerSub}>{rows.length} alertas activas</Text>
          </View>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.warning} />
            <Text style={styles.roleTxt}>SERENAZGO</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: colors.danger }]}>
            <Text style={[styles.statNum, { color: colors.danger }]}>{countP1}</Text>
            <Text style={styles.statLabel}>P1 Urgente</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.warning }]}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{countP2}</Text>
            <Text style={styles.statLabel}>P2 Media</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{rows.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {repeatedReporters.length > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={16} color={colors.warning} />
              <Text style={styles.alertTitle}>Vecinos con multiples reportes</Text>
            </View>
            {repeatedReporters.map(([uid, count]) => (
              <View key={uid} style={styles.alertRow}>
                <Text style={styles.alertTxt}>{count} reportes activos del mismo vecino</Text>
                <TouchableOpacity style={styles.summarizeBtn} onPress={() => handleSummarize(uid)}>
                  <Ionicons name="sparkles" size={13} color={colors.brand} />
                  <Text style={styles.summarizeTxt}>Resumir con IA</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.filterRow}>
          {(["todos", "P1", "P2"] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            >
              <Text style={[styles.filterTxt, filter === f && styles.filterTxtActive]}>
                {f === "todos" ? "Todos" : f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle" size={52} color={colors.success} />
            <Text style={styles.emptyTxt}>Sin alertas activas</Text>
            <Text style={styles.emptySub}>La comunidad esta tranquila.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta    = item.data.incidentType ? INCIDENT_META[item.data.incidentType] : null;
          const pColor  = priorityColor(item.data.priority);
          const isPanic = item.data.type === "panic";
          const isP1    = item.data.priority === "P1";
          const catLabel = (item.data as any).categoryLabel;

          return (
            <Pressable
              style={[styles.card, isP1 && styles.cardP1]}
              onPress={() => router.push({ pathname: "/report/[id]", params: { id: item.id } })}
            >
              <View style={[styles.priorityBar, { backgroundColor: pColor }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={[styles.priorityBadge, { backgroundColor: pColor + "22", borderColor: pColor }]}>
                    <Text style={[styles.priorityTxt, { color: pColor }]}>{item.data.priority ?? "P3"}</Text>
                  </View>
                  <Text style={styles.cardType}>
                    {isPanic ? "Alerta de Panico" : (catLabel ?? meta?.label ?? "Reporte")}
                  </Text>
                  <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[item.data.status] }]}>
                    <Text style={[styles.statusTxt, { color: STATUS_COLOR[item.data.status] }]}>
                      {STATUS_LABEL[item.data.status]}
                    </Text>
                  </View>
                </View>

                {(meta || catLabel) && (
                  <View style={[styles.incidentChip, { borderColor: (meta?.color ?? colors.textMuted) + "66" }]}>
                    <Ionicons name={meta?.icon ?? "grid"} size={13} color={meta?.color ?? colors.textMuted} />
                    <Text style={[styles.incidentChipTxt, { color: meta?.color ?? colors.textMuted }]}>
                      {catLabel ?? meta?.label}
                    </Text>
                  </View>
                )}

                {item.data.text && (
                  <Text style={styles.cardText} numberOfLines={2}>{item.data.text}</Text>
                )}

                <View style={styles.authorRow}>
                  <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.authorTxt}>
                    {(item.data as any).authorName ?? ("Vecino #" + (item.data.authorUid?.slice(-4) ?? "?"))}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  {item.data.photoUrl ? (
                    <View style={styles.photoTag}>
                      <Ionicons name="image" size={12} color={colors.brand} />
                      <Text style={styles.photoTagTxt}>Foto adjunta</Text>
                    </View>
                  ) : <View />}
                  <View style={styles.detailHint}>
                    <Text style={styles.detailHintTxt}>Ver detalle</Text>
                    <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                  </View>
                </View>

                <View style={styles.actions}>
                  {item.data.status === "received" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.brand }]}
                      onPress={() => changeStatus(item.id, "attending")}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id
                        ? <ActivityIndicator color="white" size="small" />
                        : (<><Ionicons name="eye" size={15} color="white" /><Text style={styles.actionTxt}>Atender</Text></>)
                      }
                    </TouchableOpacity>
                  )}
                  {item.data.status === "attending" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.success }]}
                      onPress={() => changeStatus(item.id, "closed")}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id
                        ? <ActivityIndicator color="white" size="small" />
                        : (<><Ionicons name="checkmark-circle" size={15} color="white" /><Text style={styles.actionTxt}>Cerrar caso</Text></>)
                      }
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnGhost]}
                    onPress={() => changeStatus(item.id, "dismissed")}
                    disabled={busyId === item.id}
                  >
                    <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                    <Text style={[styles.actionTxt, { color: colors.textMuted }]}>Descartar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={summaryModal} transparent animationType="fade" onRequestClose={() => setSummaryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Ionicons name="sparkles" size={20} color={colors.brand} />
              <Text style={styles.modalTitle}>Resumen IA</Text>
              <TouchableOpacity onPress={() => setSummaryModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {summaryLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={colors.brand} size="large" />
                <Text style={styles.modalLoadingTxt}>Analizando reportes...</Text>
              </View>
            ) : (
              <Text style={styles.modalSummary}>{summaryText}</Text>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const W = colors.warning;
const B = colors.brand;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list:   { padding: 16, gap: 12 },

  fixedHeader: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
  },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: "900" },
  headerSub:   { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: W + "18",
    borderWidth: 1, borderColor: W + "44",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  roleTxt: { color: W, fontSize: 11, fontWeight: "800", letterSpacing: 1 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: "center", gap: 4,
  },
  statNum:   { color: colors.text, fontSize: 24, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: B, borderColor: B },
  filterTxt:       { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "white" },

  emptyWrap: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyTxt:  { color: colors.text, fontSize: 16, fontWeight: "700" },
  emptySub:  { color: colors.textMuted, fontSize: 13 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", overflow: "hidden",
  },
  cardP1:      { borderColor: colors.danger + "66" },
  priorityBar: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 8 },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  priorityBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityTxt:   { fontSize: 11, fontWeight: "800" },
  cardType:      { color: colors.text, fontWeight: "700", fontSize: 13, flex: 1 },
  statusBadge:   { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusTxt:     { fontSize: 11, fontWeight: "700" },

  incidentChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  incidentChipTxt: { fontSize: 12, fontWeight: "700" },
  cardText:        { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  authorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  authorTxt:  { color: colors.textMuted, fontSize: 12 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  photoTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: B + "18",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  photoTagTxt:   { color: B, fontSize: 11, fontWeight: "600" },
  detailHint:    { flexDirection: "row", alignItems: "center", gap: 2 },
  detailHintTxt: { color: colors.textMuted, fontSize: 12 },

  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row", gap: 6,
    paddingVertical: 10, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  actionBtnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  actionTxt:      { color: "white", fontWeight: "700", fontSize: 13 },

  alertCard: {
    backgroundColor: W + "11",
    borderRadius: 14, borderWidth: 1, borderColor: W + "44",
    padding: 14, gap: 10, marginBottom: 4,
  },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertTitle:  { color: W, fontWeight: "700", fontSize: 13 },
  alertRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  alertTxt:    { color: colors.text, fontSize: 13, flex: 1 },
  summarizeBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: B + "18",
    borderWidth: 1, borderColor: B + "44",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  summarizeTxt: { color: B, fontSize: 12, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 24 },
  modalBox: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16,
  },
  modalHeader:     { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle:      { color: colors.text, fontSize: 17, fontWeight: "800", flex: 1 },
  modalLoading:    { alignItems: "center", gap: 12, paddingVertical: 20 },
  modalLoadingTxt: { color: colors.textMuted, fontSize: 14 },
  modalSummary:    { color: colors.text, fontSize: 15, lineHeight: 22 },
});