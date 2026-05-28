// Bandeja del operador: P1/P2 activos. Acciones atender/cerrar/descartar.
import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";

import { Screen } from "@/components/ui/Screen";
import { activeReportsQuery, isOperatorRelevant } from "@/lib/collections";
import { markReportStatus } from "@/lib/functions";
import { colors } from "@/theme/colors";
import type { ReportDoc, ReportStatus } from "@/types/models";

type Row = { id: string; data: ReportDoc };

export default function Operator() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(activeReportsQuery(), (snap) =>
      setRows(
        snap.docs
          .map((d: QueryDocumentSnapshot<ReportDoc>) => ({ id: d.id, data: d.data() }))
          // Filtro client-side: solo P1/P2 (panic ya entra como P1 por trigger).
          // Reportes recién creados sin priority aún se muestran como pendientes.
          .filter((r) => !r.data.priority || isOperatorRelevant(r.data)),
      ),
    );
  }, []);

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

  return (
    <Screen padded={false}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.h1}>Bandeja P1/P2</Text>}
        ListEmptyComponent={<Text style={styles.empty}>Sin alertas activas.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.pill, { backgroundColor: priorityBg(item.data.priority) }]}>
                <Text style={styles.pillText}>{item.data.priority ?? "—"}</Text>
              </View>
              <Text style={styles.type}>{item.data.type === "panic" ? "Pánico" : "Texto"}</Text>
              <Text style={styles.status}>{item.data.status}</Text>
            </View>
            {item.data.text && <Text style={styles.text}>{item.data.text}</Text>}
            <Text style={styles.reason}>{item.data.priorityReason ?? "esperando clasificación…"}</Text>
            <View style={styles.actions}>
              {item.data.status === "received" && (
                <Action label="Atender" onPress={() => changeStatus(item.id, "attending")} busy={busyId === item.id} />
              )}
              {item.data.status === "attending" && (
                <Action label="Cerrar" onPress={() => changeStatus(item.id, "closed")} busy={busyId === item.id} />
              )}
              <Action label="Descartar" onPress={() => changeStatus(item.id, "dismissed")} busy={busyId === item.id} ghost />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

function Action({ label, onPress, busy, ghost }: { label: string; onPress: () => void; busy: boolean; ghost?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.actionBtn, ghost ? styles.actionGhost : styles.actionSolid, busy && { opacity: 0.6 }]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function priorityBg(p?: string): string {
  if (p === "P1") return colors.p1;
  if (p === "P2") return colors.p2;
  return colors.p3;
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 10 },
  h1: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { color: colors.text, fontWeight: "800", fontSize: 11 },
  type: { color: colors.text, fontWeight: "700" },
  status: { color: colors.textMuted, fontSize: 12, marginLeft: "auto" },
  text: { color: colors.text, fontSize: 14 },
  reason: { color: colors.textMuted, fontSize: 11 },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", borderWidth: 1 },
  actionSolid: { backgroundColor: colors.brand, borderColor: colors.brand },
  actionGhost: { backgroundColor: "transparent", borderColor: colors.border },
  actionText: { color: colors.text, fontWeight: "700", fontSize: 13 },
});
