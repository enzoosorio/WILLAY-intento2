// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/(tabs)/my-reports.tsx
// Historial de reportes del vecino — diseño profesional
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import {
  FlatList, Pressable, StyleSheet, Text,
  View, TouchableOpacity,
} from "react-native";
import { onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { myReportsQuery } from "@/lib/collections";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { IncidentType, ReportDoc } from "@/types/models";

type Row = { id: string; data: ReportDoc };
type Filter = "todos" | "received" | "attending" | "closed";

const STATUS_INFO: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  received:  { label: "Recibido",    color: colors.warning, icon: "time"              },
  attending: { label: "En atención", color: colors.brand,   icon: "eye"               },
  closed:    { label: "Cerrado",     color: colors.success, icon: "checkmark-circle"  },
  dismissed: { label: "Descartado",  color: colors.textMuted, icon: "close-circle"   },
};

const INCIDENT_META: Record<IncidentType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  robo:               { label: "Robo",               icon: "card",         color: "#FF5C5C" },
  asalto:             { label: "Asalto",             icon: "alert-circle", color: "#FF8A3D" },
  violencia_familiar: { label: "Violencia familiar", icon: "hand-left",    color: "#E0457B" },
  accidente:          { label: "Salud",              icon: "medkit",       color: "#F5A524" },
  persona_sospechosa: { label: "Rescate",            icon: "shield",       color: "#3DA5D9" },
  vandalismo:         { label: "Incendio",           icon: "flame",        color: "#FF6B35" },
  otro:               { label: "Otro",               icon: "grid",         color: "#A1A8B8" },
};

function priorityColor(p?: string) {
  if (p === "P1") return colors.danger;
  if (p === "P2") return colors.warning;
  return colors.textMuted;
}

function timeAgo(ts: any): string {
  if (!ts?.seconds) return "";
  const diff = Math.floor((Date.now() / 1000) - ts.seconds);
  if (diff < 60) return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

export default function MyReports() {
  const { user } = useAuthUser();
  const router   = useRouter();
  const [rows,   setRows]   = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("todos");

  useEffect(() => {
    if (!user) return;
    return onSnapshot(myReportsQuery(user.uid), (snap) =>
      setRows(snap.docs.map((d: QueryDocumentSnapshot<ReportDoc>) => ({ id: d.id, data: d.data() })))
    );
  }, [user]);

  const filtered = rows.filter((r) => filter === "todos" || r.data.status === filter);

  const countRecibidos  = rows.filter((r) => r.data.status === "received").length;
  const countAtendiendo = rows.filter((r) => r.data.status === "attending").length;
  const countCerrados   = rows.filter((r) => r.data.status === "closed").length;

  return (
    <Screen padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Mis Reportes</Text>
              <Text style={styles.subtitle}>{rows.length} reportes enviados</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderColor: colors.warning }]}>
                <Text style={[styles.statNum, { color: colors.warning }]}>{countRecibidos}</Text>
                <Text style={styles.statLabel}>Recibidos</Text>
              </View>
              <View style={[styles.statCard, { borderColor: colors.brand }]}>
                <Text style={[styles.statNum, { color: colors.brand }]}>{countAtendiendo}</Text>
                <Text style={styles.statLabel}>En atención</Text>
              </View>
              <View style={[styles.statCard, { borderColor: colors.success }]}>
                <Text style={[styles.statNum, { color: colors.success }]}>{countCerrados}</Text>
                <Text style={styles.statLabel}>Cerrados</Text>
              </View>
            </View>

            {/* Filtros */}
            <View style={styles.filterRow}>
              {([
                { id: "todos",     label: "Todos"       },
                { id: "received",  label: "Recibidos"   },
                { id: "attending", label: "En atención" },
                { id: "closed",    label: "Cerrados"    },
              ] as { id: Filter; label: string }[]).map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterTxt, filter === f.id && styles.filterTxtActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={52} color={colors.border} />
            <Text style={styles.emptyTxt}>
              {filter === "todos" ? "No tienes reportes aún" : "No hay reportes en esta categoría"}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(tabs)" as never)}
            >
              <Text style={styles.emptyBtnTxt}>+ Hacer un reporte</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const status   = STATUS_INFO[item.data.status] ?? STATUS_INFO.received;
          const meta     = item.data.incidentType ? INCIDENT_META[item.data.incidentType] : null;
          const isPanic  = item.data.type === "panic";
          const pColor   = priorityColor(item.data.priority);

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => router.push({ pathname: "/report/[id]", params: { id: item.id } })}
            >
              {/* Barra lateral de estado */}
              <View style={[styles.statusBar, { backgroundColor: status.color }]} />

              <View style={styles.cardContent}>
                {/* Fila superior */}
                <View style={styles.cardTop}>
                  {/* Tipo */}
                  <View style={[styles.typeIcon, { backgroundColor: (meta?.color ?? colors.brand) + "22" }]}>
                    <Ionicons
                      name={isPanic ? "alarm" : (meta?.icon ?? "document-text")}
                      size={20}
                      color={isPanic ? colors.danger : (meta?.color ?? colors.brand)}
                    />
                  </View>
                  <Text style={styles.cardType} numberOfLines={1}>
                    {isPanic ? "Alerta de Pánico" : (meta?.label ?? "Reporte")}
                  </Text>

                  {/* Prioridad */}
                  {item.data.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: pColor + "22", borderColor: pColor }]}>
                      <Text style={[styles.priorityTxt, { color: pColor }]}>{item.data.priority}</Text>
                    </View>
                  )}
                </View>

                {/* Descripción */}
                {item.data.text && (
                  <Text style={styles.cardText} numberOfLines={2}>{item.data.text}</Text>
                )}

                {/* Fila inferior */}
                <View style={styles.cardBottom}>
                  {/* Estado */}
                  <View style={styles.statusChip}>
                    <Ionicons name={status.icon} size={13} color={status.color} />
                    <Text style={[styles.statusTxt, { color: status.color }]}>{status.label}</Text>
                  </View>

                  {/* Tiempo */}
                  <Text style={styles.timeTxt}>{timeAgo(item.data.createdAt)}</Text>

                  {/* Flecha */}
                  <Ionicons name="chevron-forward" size={14} color={colors.border} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },

  header: { marginBottom: 16, paddingTop: 8 },
  title:    { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: "center", gap: 4,
  },
  statNum:   { fontSize: 24, fontWeight: "900", color: colors.text },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600", textAlign: "center" },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterTxt:       { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "white" },

  emptyWrap: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyTxt:  { color: colors.textMuted, fontSize: 15, textAlign: "center" },
  emptyBtn:  {
    backgroundColor: colors.brand, borderRadius: 999,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnTxt: { color: "white", fontWeight: "700" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", overflow: "hidden",
  },
  statusBar:   { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 8 },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardType: { color: colors.text, fontWeight: "700", fontSize: 14, flex: 1 },
  priorityBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityTxt:   { fontSize: 11, fontWeight: "800" },

  cardText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  statusTxt:  { fontSize: 12, fontWeight: "700" },
  timeTxt:    { color: colors.textMuted, fontSize: 11 },
});