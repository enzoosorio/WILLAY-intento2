// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/report/[id].tsx
// Detalle de reporte — vista para operador y vecino
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import {
  Image, StyleSheet, Text, View, ActivityIndicator,
  Pressable, Modal, TouchableOpacity, Alert,
} from "react-native";
import { onSnapshot } from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { reportDoc } from "@/lib/collections";
import { markReportStatus } from "@/lib/functions";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { IncidentType, ReportDoc, ReportStatus } from "@/types/models";

const INCIDENT_META: Record<IncidentType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  robo:               { label: "Robo",               icon: "card",         color: "#FF5C5C" },
  asalto:             { label: "Asalto",             icon: "alert-circle", color: "#FF8A3D" },
  violencia_familiar: { label: "Violencia familiar", icon: "hand-left",    color: "#E0457B" },
  accidente:          { label: "Accidente / Salud",  icon: "medkit",       color: "#F5A524" },
  persona_sospechosa: { label: "Pers. sospechosa",   icon: "eye",          color: "#8B5CF6" },
  vandalismo:         { label: "Vandalismo",          icon: "flame",        color: "#FF6B35" },
  otro:               { label: "Otro",                icon: "grid",         color: "#A1A8B8" },
};

const STATUS_INFO: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  received:  { label: "Recibido",    color: colors.warning, icon: "time"             },
  attending: { label: "En atención", color: colors.brand,   icon: "eye"              },
  closed:    { label: "Cerrado",     color: colors.success, icon: "checkmark-circle" },
  dismissed: { label: "Descartado",  color: colors.textMuted, icon: "close-circle"  },
};

const PRIORITY_INFO: Record<string, { label: string; color: string }> = {
  P1: { label: "P1 — Urgente",     color: colors.danger  },
  P2: { label: "P2 — Media",       color: colors.warning },
  P3: { label: "P3 — Baja",        color: "#3DA5D9"      },
};

export default function ReportDetail() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);

  const [data,        setData]        = useState<ReportDoc | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [busy,        setBusy]        = useState(false);

  const isOperator = profile?.role === "operator";

  useEffect(() => {
    if (!id) return;
    return onSnapshot(reportDoc(id), (snap) => {
      setData(snap.exists() ? (snap.data() as ReportDoc) : null);
      setLoading(false);
    });
  }, [id]);

  async function changeStatus(status: Extract<ReportStatus, "attending" | "closed" | "dismissed">) {
    if (!id) return;
    setBusy(true);
    try {
      await markReportStatus()({ reportId: id, status });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return (
    <Screen>
      <View style={styles.center}><ActivityIndicator color={colors.brand} size="large" /></View>
    </Screen>
  );

  if (!data) return (
    <Screen>
      <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>Reporte no encontrado.</Text>
    </Screen>
  );

  const meta     = data.incidentType ? INCIDENT_META[data.incidentType] : null;
  const status   = STATUS_INFO[data.status] ?? { label: data.status, color: colors.textMuted, icon: "help-circle" as const };
  const priority = data.priority ? PRIORITY_INFO[data.priority] : null;
  const isPanic  = data.type === "panic";

  return (
    <Screen padded={false} scroll>
      {/* Header dinámico */}
      <View style={[styles.header, { backgroundColor: meta?.color ?? colors.brand }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Detalle del Reporte</Text>
          <Text style={styles.headerTitle}>
            {isPanic ? "🚨 Alerta de Pánico" : `${meta?.label ?? "Reporte"}`}
          </Text>
        </View>
        {meta && <Ionicons name={meta.icon} size={30} color="white" style={{ opacity: 0.85 }} />}
      </View>

      <View style={styles.content}>

        {/* Estado actual */}
        <View style={[styles.statusCard, { borderColor: status.color + "44", backgroundColor: status.color + "11" }]}>
          <Ionicons name={status.icon} size={20} color={status.color} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusCardLabel}>Estado actual</Text>
            <Text style={[styles.statusCardValue, { color: status.color }]}>{status.label}</Text>
          </View>
          {priority && (
            <View style={[styles.priorityBadge, { backgroundColor: priority.color + "22", borderColor: priority.color }]}>
              <Text style={[styles.priorityTxt, { color: priority.color }]}>{data.priority}</Text>
            </View>
          )}
        </View>

        {/* Info del incidente */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>INFORMACIÓN DEL INCIDENTE</Text>

          {meta && (
            <InfoRow icon={meta.icon} iconColor={meta.color} label="Tipo" value={meta.label} />
          )}
          {isPanic && (
            <InfoRow icon="alarm" iconColor={colors.danger} label="Tipo" value="Alerta de Pánico" />
          )}
          {priority && (
            <InfoRow icon="flag" iconColor={priority.color} label="Prioridad" value={priority.label} valueColor={priority.color} />
          )}
          {data.text && (
            <>
              <View style={styles.divider} />
              <Text style={styles.infoLabel}>DESCRIPCIÓN</Text>
              <Text style={styles.infoText}>{data.text}</Text>
            </>
          )}
        </View>

        {/* Foto */}
        {data.photoUrl && (
          <View style={styles.photoCard}>
            <Text style={styles.sectionLabel}>FOTO ADJUNTA</Text>
            <Pressable onPress={() => setZoomVisible(true)} style={styles.photoWrap}>
              <Image source={{ uri: data.photoUrl }} style={styles.photo} resizeMode="cover" />
              <View style={styles.zoomHint}>
                <Ionicons name="expand" size={16} color="white" />
                <Text style={{ color: "white", fontSize: 11, fontWeight: "700" }}>Ver completa</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Acciones del operador */}
        {isOperator && (
          <View style={styles.actionsCard}>
            <Text style={styles.sectionLabel}>ACCIONES</Text>
            <View style={styles.actionRow}>
              {data.status === "received" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.brand }]}
                  onPress={() => changeStatus("attending")}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator color="white" /> : (
                    <>
                      <Ionicons name="eye" size={18} color="white" />
                      <Text style={styles.actionTxt}>Atender</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {data.status === "attending" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                  onPress={() => changeStatus("closed")}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator color="white" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="white" />
                      <Text style={styles.actionTxt}>Cerrar caso</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {data.status !== "dismissed" && data.status !== "closed" && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnGhost]}
                  onPress={() => changeStatus("dismissed")}
                  disabled={busy}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  <Text style={[styles.actionTxt, { color: colors.textMuted }]}>Descartar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </View>

      {/* Modal zoom foto */}
      <Modal visible={zoomVisible} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
        <Pressable style={styles.modalBg} onPress={() => setZoomVisible(false)}>
          <Image source={{ uri: data.photoUrl }} style={styles.photoFull} resizeMode="contain" />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setZoomVisible(false)}>
            <Ionicons name="close" size={26} color="white" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function InfoRow({ icon, iconColor, label, value, valueColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerSub:   { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "900" },

  content: { padding: 16, gap: 12 },

  statusCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  statusCardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  statusCardValue: { fontSize: 16, fontWeight: "800" },
  priorityBadge:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  priorityTxt:     { fontSize: 13, fontWeight: "800" },

  infoCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12,
  },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  infoRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel:{ color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  infoValue:{ color: colors.text, fontSize: 15, fontWeight: "600" },
  infoText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  divider:  { height: 1, backgroundColor: colors.border },

  photoCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10,
  },
  photoWrap: { borderRadius: 12, overflow: "hidden", position: "relative" },
  photo:     { width: "100%", height: 220, backgroundColor: colors.surfaceAlt },
  zoomHint:  {
    position: "absolute", bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },

  actionsCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", gap: 8,
    paddingVertical: 14, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  actionBtnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1, borderColor: colors.border,
  },
  actionTxt: { color: "white", fontWeight: "800", fontSize: 14 },

  modalBg:   { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  photoFull: { width: "100%", height: "80%" },
  closeBtn:  {
    position: "absolute", top: 48, right: 20,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 999, padding: 10,
  },
});