import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { onSnapshot } from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { reportDoc } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { ReportDoc } from "@/types/models";

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ReportDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(reportDoc(id), (snap) => {
      setData(snap.exists() ? (snap.data() as ReportDoc) : null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Screen><ActivityIndicator color={colors.brand} /></Screen>;
  if (!data) return <Screen><Text style={{ color: colors.textMuted }}>Reporte no encontrado.</Text></Screen>;

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.label}>Tipo</Text>
        <Text style={styles.value}>{data.type === "panic" ? "Pánico" : "Texto"}</Text>
        {data.text && (
          <>
            <Text style={styles.label}>Descripción</Text>
            <Text style={styles.value}>{data.text}</Text>
          </>
        )}
        <Text style={styles.label}>Prioridad</Text>
        <Text style={styles.value}>{data.priority ?? "esperando clasificación…"}</Text>
        <Text style={styles.label}>Razón</Text>
        <Text style={styles.value}>{data.priorityReason ?? "—"}</Text>
        <Text style={styles.label}>Estado</Text>
        <Text style={styles.value}>{data.status}</Text>
        <Text style={styles.label}>Geohash</Text>
        <Text style={styles.value}>{data.geohash}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 4 },
  label: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", marginTop: 8 },
  value: { color: colors.text, fontSize: 15 },
});
