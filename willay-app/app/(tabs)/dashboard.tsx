// app/(tabs)/dashboard.tsx
// Panel de estadísticas para el administrador.
// Muestra: resumen de alertas, gráfico de barras por tipo, gráfico por sector,
// y listado de las últimas incidencias recientes.
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { onSnapshot } from "firebase/firestore";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { activeReportsQuery, reportsCol } from "@/lib/collections";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { ReportDoc } from "@/types/models";

const { width } = Dimensions.get("window");
const CHART_W = width - 48;

type Row = { id: string; data: ReportDoc };

const SECTORES = ["Zapallal", "La Ensenada", "Huamantanga", "Centro", "Otros"];
const SECTOR_MAP: Record<string, string> = {
  zapallal: "Zapallal",
  la_ensenada: "La Ensenada",
  huamantanga: "Huamantanga",
  centro: "Centro",
  otros: "Otros",
};

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

export default function Dashboard() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const [active, setActive] = useState<Row[]>([]);
  const [all, setAll] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  if (!loading && profile && profile.role !== "operator") {
    return <Redirect href="/(tabs)" />;
  }

  useEffect(() => {
    // Escucha alertas activas
    const unsubActive = onSnapshot(activeReportsQuery(), (snap) => {
      setActive(snap.docs.map((d) => ({ id: d.id, data: d.data() as ReportDoc })));
      setLoadingData(false);
    });
    return () => unsubActive();
  }, []);

  if (loading || loadingData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  // ── Cálculos ──
  const totalActive = active.length;
  const p1 = active.filter((r) => r.data.priority === "P1").length;
  const p2 = active.filter((r) => r.data.priority === "P2").length;
  const attending = active.filter((r) => r.data.status === "attending").length;
  const received = active.filter((r) => r.data.status === "received").length;

  // Conteo por tipo
  const panicCount = active.filter((r) => r.data.type === "panic").length;
  const textCount = active.filter((r) => r.data.type === "text").length;
  const maxType = Math.max(panicCount, textCount, 1);

  const router = useRouter();

  // Últimas 5 alertas
  const recent = [...active].slice(0, 5);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={22} color={colors.warning} />
          <Text style={styles.h1}>Dashboard Admin</Text>
        </View>

        {/* Tarjetas de resumen */}
        <View style={styles.cards}>
          <StatCard icon="flash" label="Activas" value={totalActive} color={colors.brand} />
          <StatCard icon="alert" label="P1 Críticas" value={p1} color={colors.p1} />
          <StatCard icon="warning" label="P2 Alerta" value={p2} color={colors.p2} />
          <StatCard icon="eye" label="En atención" value={attending} color={colors.success} />
        </View>

        {/* Gráfico de barras — Por tipo de alerta */}
        <SectionTitle>Alertas por tipo</SectionTitle>
        <View style={styles.chartBox}>
          <BarRow label="🚨 Pánico" value={panicCount} max={maxType} color={colors.p1} />
          <BarRow label="📝 Reporte" value={textCount} max={maxType} color={colors.brand} />
        </View>

        {/* Gráfico de estado */}
        <SectionTitle>Estado de alertas activas</SectionTitle>
        <View style={styles.chartBox}>
          <DonutLegend
            items={[
              { label: "Recibidas", value: received, color: colors.warning },
              { label: "En atención", value: attending, color: colors.brand },
            ]}
            total={totalActive}
          />
        </View>

        {/* Prioridades */}
        <SectionTitle>Distribución por prioridad</SectionTitle>
        <View style={styles.chartBox}>
          {(["P1", "P2", "P3"] as const).map((p) => {
            const count = active.filter((r) => r.data.priority === p).length;
            const pct = totalActive > 0 ? count / totalActive : 0;
            return (
              <View key={p} style={styles.barRow}>
                <Text style={styles.barLabel}>{p}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(pct * 100)}%`,
                        backgroundColor:
                          p === "P1" ? colors.p1 : p === "P2" ? colors.p2 : colors.p3,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* Botón estadísticas IA */}
        <TouchableOpacity
          style={styles.iaBanner}
          onPress={() => router.push("/ia-stats" as never)}
          activeOpacity={0.85}
        >
          <View style={styles.iaBannerLeft}>
            <Ionicons name="sparkles" size={22} color={colors.warning} />
            <View>
              <Text style={styles.iaBannerTitle}>Estadísticas del Modelo IA</Text>
              <Text style={styles.iaBannerSub}>Ver precisión del clasificador</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Últimas alertas */}
        <SectionTitle>Últimas alertas</SectionTitle>
        {recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <Text style={styles.emptyText}>Sin alertas activas</Text>
          </View>
        ) : (
          recent.map((r) => (
            <View key={r.id} style={styles.alertCard}>
              <View style={styles.alertHead}>
                <View style={[styles.pill, { backgroundColor: priorityBg(r.data.priority) }]}>
                  <Text style={styles.pillText}>{r.data.priority ?? "—"}</Text>
                </View>
                <Text style={styles.alertType}>
                  {r.data.type === "panic" ? "🚨 Pánico" : "📝 Reporte"}
                </Text>
                <View style={[styles.statusDot, { borderColor: STATUS_COLOR[r.data.status] }]}>
                  <Text style={[styles.statusTxt, { color: STATUS_COLOR[r.data.status] }]}>
                    {STATUS_LABEL[r.data.status]}
                  </Text>
                </View>
              </View>
              {r.data.text ? (
                <Text style={styles.alertText} numberOfLines={2}>{r.data.text}</Text>
              ) : null}
              <Text style={styles.alertReason}>
                {r.data.priorityReason ?? "Clasificando…"}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + "55" }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? value / max : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

function DonutLegend({
  items,
  total,
}: {
  items: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <View style={styles.donut}>
      {/* Círculo central */}
      <View style={styles.donutCircle}>
        <Text style={styles.donutTotal}>{total}</Text>
        <Text style={styles.donutSub}>total</Text>
      </View>
      {/* Leyenda */}
      <View style={styles.donutLegend}>
        {items.map((it) => (
          <View key={it.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: it.color }]} />
            <Text style={styles.legendLabel}>{it.label}</Text>
            <Text style={[styles.legendValue, { color: it.color }]}>{it.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function priorityBg(p?: string) {
  if (p === "P1") return colors.p1;
  if (p === "P2") return colors.p2;
  return colors.p3;
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20, gap: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  h1: { color: colors.text, fontSize: 20, fontWeight: "800" },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },

  // Tarjetas resumen
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    alignItems: "flex-start",
  },
  statValue: { fontSize: 28, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 12 },

  // Gráfico de barras
  chartBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { color: colors.text, fontSize: 13, width: 90 },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 999 },
  barValue: { color: colors.textMuted, fontSize: 12, width: 24, textAlign: "right" },

  // Donut
  donut: { flexDirection: "row", alignItems: "center", gap: 20 },
  donutCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: colors.brand,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
  },
  donutTotal: { color: colors.text, fontSize: 22, fontWeight: "900" },
  donutSub: { color: colors.textMuted, fontSize: 10 },
  donutLegend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, color: colors.text, fontSize: 13 },
  legendValue: { fontSize: 14, fontWeight: "800" },

  // Alertas recientes
  emptyBox: { alignItems: "center", gap: 8, padding: 24 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    marginBottom: 8,
  },
  alertHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { color: colors.text, fontWeight: "800", fontSize: 11 },
  alertType: { color: colors.text, fontWeight: "700", fontSize: 13 },
  statusDot: {
    marginLeft: "auto",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusTxt: { fontSize: 11, fontWeight: "700" },
  alertText: { color: colors.text, fontSize: 13 },
  alertReason: { color: colors.textMuted, fontSize: 11 },

  iaBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.warning + "11",
    borderWidth: 1, borderColor: colors.warning + "44",
    borderRadius: 14, padding: 14, marginBottom: 4,
  },
  iaBannerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  iaBannerTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  iaBannerSub:   { color: colors.textMuted, fontSize: 12 },
});