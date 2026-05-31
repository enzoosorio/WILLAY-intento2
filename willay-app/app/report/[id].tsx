import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable, Modal } from "react-native";
import { onSnapshot } from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { reportDoc } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { IncidentType, ReportDoc } from "@/types/models";

// Etiqueta legible para cada tipo de incidente
const INCIDENT_LABEL: Record<IncidentType, string> = {
  robo: "Robo",
  asalto: "Asalto",
  violencia_familiar: "Violencia familiar",
  accidente: "Accidente",
  persona_sospechosa: "Persona sospechosa",
  vandalismo: "Vandalismo",
  otro: "Otro",
};

const STATUS_LABEL: Record<string, string> = {
  received: "Recibido",
  attending: "En atención",
  closed: "Cerrado",
  dismissed: "Descartado",
};

// Texto y color amigable para la prioridad (lo que ve el vecino)
const PRIORITY_INFO: Record<string, { label: string; color: string }> = {
  P1: { label: "Alta — atención urgente", color: "#FF5C5C" },
  P2: { label: "Media", color: "#F5A524" },
  P3: { label: "Baja", color: "#3DA5D9" },
};

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ReportDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomVisible, setZoomVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(reportDoc(id), (snap) => {
      setData(snap.exists() ? (snap.data() as ReportDoc) : null);
      setLoading(false);
    });
  }, [id]);

  if (loading)
    return (
      <Screen>
        <ActivityIndicator color={colors.brand} />
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <Text style={{ color: colors.textMuted }}>Reporte no encontrado.</Text>
      </Screen>
    );

  return (
    <Screen scroll>
      <View style={styles.card}>
        <Text style={styles.label}>Tipo</Text>
        <Text style={styles.value}>{data.type === "panic" ? "Pánico" : "Texto"}</Text>

        {data.incidentType && (
          <>
            <Text style={styles.label}>Incidente</Text>
            <Text style={styles.value}>{INCIDENT_LABEL[data.incidentType]}</Text>
          </>
        )}

        {data.text && (
          <>
            <Text style={styles.label}>Descripción</Text>
            <Text style={styles.value}>{data.text}</Text>
          </>
        )}

        <Text style={styles.label}>Prioridad</Text>
        {data.priority ? (
          <View style={styles.priorityRow}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: PRIORITY_INFO[data.priority]?.color ?? colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.value,
                { color: PRIORITY_INFO[data.priority]?.color ?? colors.text },
              ]}
            >
              {PRIORITY_INFO[data.priority]?.label ?? data.priority}
            </Text>
          </View>
        ) : (
          <Text style={styles.value}>Evaluando…</Text>
        )}

        <Text style={styles.label}>Estado</Text>
        <Text style={styles.value}>{STATUS_LABEL[data.status] ?? data.status}</Text>
      </View>

      {/* ── Foto adjunta (si existe) ── */}
      {data.photoUrl && (
        <View style={styles.photoCard}>
          <Text style={styles.label}>Foto adjunta</Text>
          <Pressable onPress={() => setZoomVisible(true)} style={styles.photoWrap}>
            <Image source={{ uri: data.photoUrl }} style={styles.photo} resizeMode="cover" />
            <View style={styles.zoomHint}>
              <Ionicons name="expand" size={16} color="#fff" />
            </View>
          </Pressable>
        </View>
      )}

      {/* ── Modal para ver la foto en grande ── */}
      <Modal visible={zoomVisible} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
        <Pressable style={styles.modalBg} onPress={() => setZoomVisible(false)}>
          <Image
            source={{ uri: data.photoUrl }}
            style={styles.photoFull}
            resizeMode="contain"
          />
          <Pressable style={styles.closeBtn} onPress={() => setZoomVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  label: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", marginTop: 8 },
  value: { color: colors.text, fontSize: 15 },

  priorityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },

  // Foto
  photoCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    marginTop: 12,
  },
  photoWrap: {
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: 240,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  zoomHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    padding: 7,
  },

  // Modal zoom
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoFull: { width: "100%", height: "80%" },
  closeBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    padding: 8,
  },
});