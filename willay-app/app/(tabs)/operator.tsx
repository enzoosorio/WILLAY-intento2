import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { activeReportsQuery } from "@/lib/collections";
import { markReportStatus } from "@/lib/functions";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { IncidentType, ReportDoc, ReportStatus } from "@/types/models";

type Row = { id: string; data: ReportDoc };

const STATUS_LABEL: Record<string, string> = {
  received: "Recibido",
  attending: "En atención",
  closed: "Cerrado",
  dismissed: "Descartado",
};

const STATUS_COLOR: Record<string, string> = {
  received: colors.warning,
  attending: colors.brand,
  closed: colors.success,
  dismissed: colors.textMuted,
};

// ── Etiqueta, ícono y color por tipo de incidente ──
const INCIDENT_META: Record<
  IncidentType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  robo: { label: "Robo", icon: "bag-remove", color: "#FF5C5C" },
  asalto: { label: "Asalto", icon: "alert-circle", color: "#FF8A3D" },
  violencia_familiar: { label: "Violencia familiar", icon: "people", color: "#E0457B" },
  accidente: { label: "Accidente", icon: "car-sport", color: "#F5A524" },
  persona_sospechosa: { label: "Persona sospechosa", icon: "eye", color: "#8B5CF6" },
  vandalismo: { label: "Vandalismo", icon: "hammer", color: "#3DA5D9" },
  otro: { label: "Otro", icon: "ellipsis-horizontal-circle", color: "#A1A8B8" },
};

export default function Operator() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!loading && profile && profile.role !== "operator") {
    return <Redirect href="/(tabs)" />;
  }

  useEffect(() => {
    return onSnapshot(activeReportsQuery(), (snap) =>
      setRows(
        snap.docs.map((d: QueryDocumentSnapshot<ReportDoc>) => ({
          id: d.id,
          data: d.data(),
        })),
      ),
    );
  }, []);

  async function changeStatus(
    id: string,
    status: Extract<ReportStatus, "attending" | "closed" | "dismissed">,
  ) {
    setBusyId(id);
    try {
      await markReportStatus()({ reportId: id, status });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Ionicons name="shield-checkmark" size={22} color={colors.warning} />
              <Text style={styles.h1}>Panel de Control</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rows.length} activas</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.empty}>Sin alertas activas</Text>
            <Text style={styles.emptySub}>La comunidad está tranquila por ahora.</Text>
          </View>
        }
        renderItem={({ item }) => {
          // Metadatos del tipo de incidente (si existe)
          const meta = item.data.incidentType
            ? INCIDENT_META[item.data.incidentType]
            : null;

          return (
            <View style={styles.card}>
              {/* Zona clickeable: abre el detalle del reporte */}
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/report/[id]", params: { id: item.id } })
                }
              >
                <View style={styles.cardHead}>
                  <View style={[styles.pill, { backgroundColor: priorityBg(item.data.priority) }]}>
                    <Text style={styles.pillText}>{item.data.priority ?? "—"}</Text>
                  </View>
                  <Text style={styles.type}>
                    {item.data.type === "panic" ? "🚨 Pánico" : "📝 Reporte"}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { borderColor: STATUS_COLOR[item.data.status] ?? colors.border },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.data.status] }]}>
                      {STATUS_LABEL[item.data.status] ?? item.data.status}
                    </Text>
                  </View>
                </View>

                {/* ── Chip del tipo de incidente ── */}
                {meta && (
                  <View style={[styles.typeChip, { borderColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={13} color={meta.color} />
                    <Text style={[styles.typeChipText, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                  </View>
                )}

                {item.data.text && <Text style={styles.reportText}>{item.data.text}</Text>}

                {/* ── Indicador de foto + flecha "ver detalle" ── */}
                <View style={styles.metaRow}>
                  {item.data.photoUrl ? (
                    <View style={styles.photoTag}>
                      <Ionicons name="image" size={13} color={colors.brand} />
                      <Text style={styles.photoTagText}>Foto adjunta</Text>
                    </View>
                  ) : (
                    <View />
                  )}
                  <View style={styles.detailHint}>
                    <Text style={styles.detailHintText}>Ver detalle</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </View>
                </View>
              </Pressable>

              <View style={styles.actions}>
                {item.data.status === "received" && (
                  <ActionBtn
                    label="Atender"
                    icon="eye"
                    color={colors.brand}
                    onPress={() => changeStatus(item.id, "attending")}
                    busy={busyId === item.id}
                  />
                )}
                {item.data.status === "attending" && (
                  <ActionBtn
                    label="Cerrar"
                    icon="checkmark-circle"
                    color={colors.success}
                    onPress={() => changeStatus(item.id, "closed")}
                    busy={busyId === item.id}
                  />
                )}
                <ActionBtn
                  label="Descartar"
                  icon="close-circle"
                  color={colors.textMuted}
                  onPress={() => changeStatus(item.id, "dismissed")}
                  busy={busyId === item.id}
                  ghost
                />
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

function ActionBtn({
  label,
  icon,
  color,
  onPress,
  busy,
  ghost,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  busy: boolean;
  ghost?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[
        styles.actionBtn,
        ghost
          ? { backgroundColor: "transparent", borderColor: colors.border }
          : { backgroundColor: color, borderColor: color },
        busy && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={icon} size={14} color={ghost ? colors.textMuted : "#fff"} />
      <Text style={[styles.actionText, ghost && { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function priorityBg(p?: string): string {
  if (p === "P1") return colors.p1;
  if (p === "P2") return colors.p2;
  return colors.p3;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 20, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  h1: { color: colors.text, fontSize: 20, fontWeight: "800" },
  badge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 8 },
  empty: { color: colors.text, fontSize: 16, fontWeight: "700" },
  emptySub: { color: colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    minWidth: 32,
    alignItems: "center",
  },
  pillText: { color: colors.text, fontWeight: "800", fontSize: 11 },
  type: { color: colors.text, fontWeight: "700", fontSize: 13 },
  statusBadge: {
    marginLeft: "auto",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  // Chip de tipo de incidente
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeChipText: { fontSize: 12, fontWeight: "700" },

  reportText: { color: colors.text, fontSize: 14, lineHeight: 20 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  photoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.brand + "1A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  photoTagText: { color: colors.brand, fontSize: 12, fontWeight: "600" },
  detailHint: { flexDirection: "row", alignItems: "center", gap: 2 },
  detailHintText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});