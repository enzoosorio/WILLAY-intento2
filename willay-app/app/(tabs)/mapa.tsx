import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from "react-native";

import { onSnapshot } from "firebase/firestore";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { Screen } from "@/components/ui/Screen";
import { activeReportsQuery } from "@/lib/collections";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { ReportDoc } from "@/types/models";

const { width } = Dimensions.get("window");

type Row = { id: string; data: ReportDoc };
type Sector = { id: string; label: string; zone: string };

const SECTORS: Sector[] = [
  { id: "zapallal", label: "Zapallal", zone: "zapallal" },
  { id: "la_ensenada", label: "La Ensenada", zone: "la_ensenada" },
  { id: "huamantanga", label: "Huamantanga", zone: "huamantanga" },
  { id: "centro", label: "Centro", zone: "centro" },
  { id: "otros", label: "Otros", zone: "otros" },
];

function pct(val: number, total: number) {
  return total > 0 ? val / total : 0;
}

function heatColor(count: number, max: number): string {
  if (max === 0 || count === 0) return colors.surface;
  const ratio = count / max;
  if (ratio > 0.66) return "#7f1d1d";
  if (ratio > 0.33) return "#92400e";
  return "#1e3a5f";
}

// Color del radar según prioridad
function radarColor(priority?: string): string {
  if (priority === "P1") return "#FF3B3B";
  if (priority === "P2") return "#F5A524";
  return "#3DA5D9";
}

// ════════════════════════════════════════════════════════════════════
// MARCADOR RADAR ANIMADO
// Dentro de los marcadores de react-native-maps, Animated no siempre
// redibuja. Por eso usamos un valor de progreso por estado (setInterval)
// que fuerza el re-render del marcador y produce el pulso de radar.
// ════════════════════════════════════════════════════════════════════
function RadarMarker({ color }: { color: string }) {
  // progress va de 0 a 1 en bucle; lo movemos manualmente con un intervalo
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const STEP_MS = 60; // cada cuánto avanza (más bajo = más fluido)
    const DURATION = 1800; // duración de una onda completa
    let raf = 0;
    const start = Date.now();

    const id = setInterval(() => {
      const elapsed = (Date.now() - start) % DURATION;
      setProgress(elapsed / DURATION);
    }, STEP_MS);

    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Dos ondas desfasadas (la segunda va medio ciclo adelante)
  const p1 = progress;
  const p2 = (progress + 0.5) % 1;

  const ringStyle = (p: number) => ({
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: color,
    position: "absolute" as const,
    transform: [{ scale: 0.3 + p * 2.1 }],
    opacity: p < 0.6 ? 0.6 - p * 0.5 : Math.max(0, 0.3 - (p - 0.6) * 0.75),
  });

  return (
    <View style={styles.radarWrap}>
      <View style={ringStyle(p1)} />
      <View style={ringStyle(p2)} />
      <View style={[styles.radarGlow, { backgroundColor: color }]} />
      <View style={[styles.radarCore, { backgroundColor: color }]} />
    </View>
  );
}

export default function Mapa() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);

  const [rows, setRows] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      activeReportsQuery(),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, data: d.data() as ReportDoc }));
        setRows(data);
        setLoadingData(false);
      },
      (err) => {
        console.log("[mapa] firestore error", err);
        setLoadingData(false);
      },
    );
    return () => unsub();
  }, []);

  if (!loading && profile && profile.role !== "operator") {
    return <Redirect href="/(tabs)" />;
  }

  if (loading || loadingData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const countByZone: Record<string, number> = {};
  rows.forEach((r) => {
    const zone = (r.data as any).zone ?? "otros";
    countByZone[zone] = (countByZone[zone] ?? 0) + 1;
  });

  const maxCount = Math.max(...Object.values(countByZone), 1);
  const selectedSector = SECTORS.find((s) => s.id === selected);
  const selectedRows = selected
    ? rows.filter((r) => ((r.data as any).zone ?? "otros") === selected)
    : [];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Ionicons name="radio" size={22} color={colors.warning} />
          <Text style={styles.h1}>Radar de incidencias</Text>
        </View>
        <Text style={styles.sub}>Alertas ciudadanas en tiempo real</Text>

        {/* LEYENDA */}
        <View style={styles.legend}>
          {[
            { color: "#FF3B3B", label: "P1 Crítico" },
            { color: "#F5A524", label: "P2 Moderado" },
            { color: "#3DA5D9", label: "P3 / Bajo" },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: l.color }]} />
              <Text style={styles.legendTxt}>{l.label}</Text>
            </View>
          ))}
        </View>

        {/* GOOGLE MAPS con marcadores radar */}
        <View style={styles.mapWrap}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: -11.865,
              longitude: -77.076,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {rows.map((r) => {
              const location = (r.data as any)?.location;
              if (!location) return null;

              return (
                <Marker
                  key={r.id}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title={
                    r.data.type === "panic" ? "🚨 Alerta de pánico" : "📝 Reporte ciudadano"
                  }
                  description={r.data.text ?? "Incidencia reportada"}
                  // Centra el marcador animado sobre la coordenada
                  anchor={{ x: 0.5, y: 0.5 }}
                  // tracksViewChanges DEBE ser true para que el pulso del
                  // radar se redibuje y se vea en movimiento.
                  tracksViewChanges={true}
                >
                  <RadarMarker color={radarColor(r.data.priority)} />
                </Marker>
              );
            })}
          </MapView>
        </View>

        {/* LISTA POR SECTOR */}
        <Text style={styles.sectionTitle}>Incidencias por sector</Text>
        <View style={styles.sectorList}>
          {SECTORS.map((s) => {
            const count = countByZone[s.zone] ?? 0;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSelected(selected === s.id ? null : s.id)}
                style={[
                  styles.sectorRow,
                  selected === s.id && { borderColor: colors.warning },
                ]}
              >
                <View style={[styles.sectorDot, { backgroundColor: heatColor(count, maxCount) }]} />
                <Text style={styles.sectorName}>{s.label}</Text>
                <View style={styles.sectorBar}>
                  <View
                    style={[
                      styles.sectorFill,
                      {
                        width: `${Math.round(pct(count, maxCount) * 100)}%`,
                        backgroundColor: count > 0 ? colors.p1 : colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.sectorCount, count > 0 && { color: colors.p1 }]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* DETALLES DEL SECTOR */}
        {selectedSector && (
          <>
            <Text style={styles.sectionTitle}>Alertas en {selectedSector.label}</Text>
            {selectedRows.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={styles.emptyTxt}>Sin alertas activas</Text>
              </View>
            ) : (
              selectedRows.map((r) => (
                <View key={r.id} style={styles.alertCard}>
                  <View style={styles.alertHead}>
                    <View style={[styles.pill, { backgroundColor: priorityBg(r.data.priority) }]}>
                      <Text style={styles.pillTxt}>{r.data.priority ?? "—"}</Text>
                    </View>
                    <Text style={styles.alertType}>
                      {r.data.type === "panic" ? "🚨 Pánico" : "📝 Reporte"}
                    </Text>
                    <Text style={[styles.alertStatus, { color: statusColor(r.data.status) }]}>
                      {statusLabel(r.data.status)}
                    </Text>
                  </View>
                  {r.data.text ? (
                    <Text style={styles.alertText} numberOfLines={2}>
                      {r.data.text}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

function priorityBg(p?: string) {
  if (p === "P1") return colors.p1;
  if (p === "P2") return colors.p2;
  return colors.p3;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    received: "Recibido",
    attending: "En atención",
    closed: "Cerrado",
    dismissed: "Descartado",
  };
  return map[s] ?? s;
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    received: colors.warning,
    attending: colors.brand,
    closed: colors.success,
    dismissed: colors.textMuted,
  };
  return map[s] ?? colors.textMuted;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20, gap: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  h1: { color: colors.text, fontSize: 20, fontWeight: "800" },
  sub: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },

  // Radar marker
  radarWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  radarCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    zIndex: 2,
  },
  radarGlow: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.35,
  },

  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  map: { width: "100%", height: 400 },

  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },

  legend: { flexDirection: "row", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendBox: { width: 14, height: 14, borderRadius: 7 },
  legendTxt: { color: colors.textMuted, fontSize: 11 },

  sectorList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  sectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  sectorDot: { width: 10, height: 10, borderRadius: 5 },
  sectorName: { color: colors.text, fontSize: 13, width: 110 },
  sectorBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    overflow: "hidden",
  },
  sectorFill: { height: "100%", borderRadius: 999 },
  sectorCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    width: 20,
    textAlign: "right",
  },

  emptyBox: { alignItems: "center", gap: 8, padding: 20 },
  emptyTxt: { color: colors.textMuted, fontSize: 13 },

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
  pillTxt: { color: colors.text, fontWeight: "800", fontSize: 11 },
  alertType: { color: colors.text, fontWeight: "700", fontSize: 13 },
  alertStatus: { marginLeft: "auto", fontSize: 11, fontWeight: "700" },
  alertText: { color: colors.text, fontSize: 13 },
});