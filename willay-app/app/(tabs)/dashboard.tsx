import { useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, Text, View,
  ActivityIndicator, Dimensions,
} from "react-native";
import { onSnapshot } from "firebase/firestore";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { activeReportsQuery } from "@/lib/collections";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { ReportDoc } from "@/types/models";

const { width } = Dimensions.get("window");
type Row = { id: string; data: ReportDoc };

const ZONE_LABEL: Record<string, string> = {
  zapallal:    "Zapallal",
  la_ensenada: "La Ensenada",
  huamantanga: "Huamantanga",
  centro:      "Centro",
  otros:       "Otros",
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  received:  { label: "Recibido",    color: colors.warning  },
  attending: { label: "En atención", color: colors.brand    },
  closed:    { label: "Cerrado",     color: colors.success  },
  dismissed: { label: "Descartado",  color: colors.textMuted},
};

function priorityColor(p?: string) {
  if (p === "P1") return colors.danger;
  if (p === "P2") return colors.warning;
  return "#3DA5D9";
}

export default function Dashboard() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const [rows,        setRows]        = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  if (!loading && profile && profile.role !== "operator") {
    return <Redirect href="/(tabs)" />;
  }

  useEffect(() => {
    return onSnapshot(activeReportsQuery(), (snap: any) => {
      setRows(snap.docs.map((d: any) => ({ id: d.id, data: d.data() as ReportDoc })));
      setLoadingData(false);
    });
  }, []);

  if (loading || loadingData) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  const total     = rows.length;
  const p1        = rows.filter((r) => r.data.priority === "P1").length;
  const p2        = rows.filter((r) => r.data.priority === "P2").length;
  const p3        = rows.filter((r) => r.data.priority === "P3" || !r.data.priority).length;
  const attending = rows.filter((r) => r.data.status === "attending").length;
  const received  = rows.filter((r) => r.data.status === "received").length;
  const panic     = rows.filter((r) => r.data.type === "panic").length;
  const reports   = rows.filter((r) => r.data.type === "text").length;

  // Por zona
  const byZone: Record<string, number> = {};
  rows.forEach((r) => {
    const z = (r.data as any).zone ?? "otros";
    byZone[z] = (byZone[z] ?? 0) + 1;
  });
  const maxZone = Math.max(...Object.values(byZone), 1);

  // Por categoría
  const byCategory: Record<string, number> = {};
  rows.forEach((r) => {
    const cat = (r.data as any).categoryLabel ?? (r.data.type === "panic" ? "Pánico" : "Otro");
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  });
  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxCat = Math.max(...topCategories.map(([, v]) => v), 1);

  const recent = [...rows].slice(0, 4);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Panel de estadísticas · Serenazgo</Text>
          </View>
          <View style={styles.badgeWrap}>
            <Ionicons name="shield-checkmark" size={14} color={colors.warning} />
            <Text style={styles.badgeTxt}>OPERADOR</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="flash"            label="Total activas" value={total}     color={colors.brand}   />
          <StatCard icon="alert-circle"     label="P1 Crítico"    value={p1}        color={colors.danger}  />
          <StatCard icon="warning"          label="P2 Moderado"   value={p2}        color={colors.warning} />
          <StatCard icon="eye"              label="En atención"   value={attending} color={colors.success} />
          <StatCard icon="time"             label="Sin atender"   value={received}  color="#A1A8B8"        />
          <StatCard icon="cellular"         label="P3 Bajo"       value={p3}        color="#3DA5D9"        />
        </View>

        {/* Tipo de alerta */}
        <Text style={styles.sectionLabel}>TIPO DE ALERTA</Text>
        <View style={styles.card}>
          <BarRow label="Pánico" value={panic}   max={Math.max(panic, reports, 1)} color={colors.danger} icon="alarm" />
          <BarRow label="Reporte" value={reports} max={Math.max(panic, reports, 1)} color={colors.brand}  icon="document-text" />
        </View>

        {/* Prioridades */}
        <Text style={styles.sectionLabel}>DISTRIBUCIÓN POR PRIORIDAD</Text>
        <View style={styles.card}>
          <View style={styles.priorityRow}>
            <PriorityCircle label="P1" value={p1} total={total} color={colors.danger}  />
            <PriorityCircle label="P2" value={p2} total={total} color={colors.warning} />
            <PriorityCircle label="P3" value={p3} total={total} color="#3DA5D9"        />
          </View>
        </View>

        {/* Por zona */}
        <Text style={styles.sectionLabel}>ALERTAS POR ZONA</Text>
        <View style={styles.card}>
          {Object.entries(ZONE_LABEL).map(([key, label]) => {
            const count = byZone[key] ?? 0;
            const ratio = count / maxZone;
            const barColor = ratio > 0.66 ? colors.danger : ratio > 0.33 ? colors.warning : colors.brand;
            return (
              <BarRow key={key} label={label} value={count} max={maxZone} color={barColor} />
            );
          })}
        </View>

        {/* Top categorías */}
        <Text style={styles.sectionLabel}>TOP INCIDENCIAS</Text>
        <View style={styles.card}>
          {topCategories.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sin datos</Text>
          ) : topCategories.map(([cat, count]) => (
            <BarRow key={cat} label={cat} value={count} max={maxCat} color={colors.brand} />
          ))}
        </View>

        {/* Recientes */}
        <Text style={styles.sectionLabel}>ÚLTIMAS ALERTAS</Text>
        {recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            <Text style={styles.emptyTxt}>Sin alertas activas</Text>
          </View>
        ) : recent.map((r) => {
          const status = STATUS_INFO[r.data.status] ?? STATUS_INFO.received;
          const isPanic = r.data.type === "panic";
          return (
            <View key={r.id} style={[styles.alertCard, { borderLeftColor: priorityColor(r.data.priority) }]}>
              <View style={styles.alertTop}>
                <View style={[styles.priorityBadge, {
                  backgroundColor: priorityColor(r.data.priority) + "22",
                  borderColor: priorityColor(r.data.priority),
                }]}>
                  <Text style={[styles.priorityTxt, { color: priorityColor(r.data.priority) }]}>
                    {r.data.priority ?? "P3"}
                  </Text>
                </View>
                <Text style={styles.alertType}>
                  {isPanic ? "Alerta de Pánico" : ((r.data as any).categoryLabel ?? "Reporte")}
                </Text>
                <View style={[styles.statusBadge, { borderColor: status.color }]}>
                  <Text style={[styles.statusTxt, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              {r.data.text && (
                <Text style={styles.alertText} numberOfLines={1}>{r.data.text}</Text>
              )}
              {(r.data as any).authorName && (
                <Text style={styles.alertAuthor}>Por: {(r.data as any).authorName}</Text>
              )}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + "44" }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BarRow({ label, value, max, color, icon }: { label: string; value: number; max: number; color: string; icon?: string }) {
  const pct = max > 0 ? Math.max(value / max, value > 0 ? 0.03 : 0) : 0;
  return (
    <View style={styles.barRow}>
      {icon && <Ionicons name={icon as any} size={14} color={color} />}
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{value}</Text>
    </View>
  );
}

function PriorityCircle({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.priorityCircleWrap}>
      <View style={[styles.priorityCircle, { borderColor: color, backgroundColor: color + "18" }]}>
        <Text style={[styles.priorityCircleNum, { color }]}>{value}</Text>
        <Text style={styles.priorityCirclePct}>{pct}%</Text>
      </View>
      <Text style={[styles.priorityCircleLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 8 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title:    { color: colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  badgeWrap: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.warning + "18",
    borderWidth: 1, borderColor: colors.warning + "44",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  badgeTxt: { color: colors.warning, fontSize: 11, fontWeight: "800", letterSpacing: 1 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  statCard: {
    width: (width - 52) / 3,
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1,
    padding: 12, gap: 4, alignItems: "flex-start",
  },
  statValue: { fontSize: 26, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 11 },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase",
    marginTop: 12, marginBottom: 8,
  },

  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, gap: 12,
  },

  barRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { color: colors.text, fontSize: 12, width: 90 },
  barTrack: { flex: 1, height: 9, backgroundColor: colors.surfaceAlt, borderRadius: 999, overflow: "hidden" },
  barFill:  { height: "100%", borderRadius: 999 },
  barValue: { fontSize: 12, fontWeight: "700", width: 22, textAlign: "right" },

  priorityRow: { flexDirection: "row", justifyContent: "space-around" },
  priorityCircleWrap: { alignItems: "center", gap: 6 },
  priorityCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, alignItems: "center", justifyContent: "center",
  },
  priorityCircleNum:   { fontSize: 22, fontWeight: "900", color: colors.text },
  priorityCirclePct:   { fontSize: 11, color: colors.textMuted },
  priorityCircleLabel: { fontSize: 13, fontWeight: "800" },

  emptyBox: { alignItems: "center", gap: 8, padding: 24 },
  emptyTxt: { color: colors.textMuted, fontSize: 14 },

  alertCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, padding: 14, gap: 5, marginBottom: 8,
  },
  alertTop:      { flexDirection: "row", alignItems: "center", gap: 8 },
  priorityBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityTxt:   { fontSize: 11, fontWeight: "800" },
  alertType:     { color: colors.text, fontWeight: "700", fontSize: 13, flex: 1 },
  statusBadge:   { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusTxt:     { fontSize: 11, fontWeight: "700" },
  alertText:     { color: colors.textMuted, fontSize: 13 },
  alertAuthor:   { color: colors.textMuted, fontSize: 11 },
});