// "Mis reportes" — onSnapshot al query del propio uid. Push de cambio de
// status llega por separado vía expo-notifications.
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { myReportsQuery } from "@/lib/collections";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { ReportDoc } from "@/types/models";

type Row = { id: string; data: ReportDoc };

export default function MyReports() {
  const { user } = useAuthUser();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = myReportsQuery(user.uid);
    return onSnapshot(q, (snap) =>
      setRows(snap.docs.map((d: QueryDocumentSnapshot<ReportDoc>) => ({ id: d.id, data: d.data() }))),
    );
  }, [user]);

  return (
    <Screen padded={false}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.h1}>Mis reportes</Text>}
        ListEmptyComponent={<Text style={styles.empty}>Aún no enviaste ningún reporte.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/report/[id]", params: { id: item.id } })}
            style={styles.row}
          >
            <View style={styles.rowHead}>
              <Text style={styles.type}>{item.data.type === "panic" ? "Pánico" : "Texto"}</Text>
              {item.data.priority && (
                <View style={[styles.pill, { backgroundColor: priorityBg(item.data.priority) }]}>
                  <Text style={styles.pillText}>{item.data.priority}</Text>
                </View>
              )}
            </View>
            {item.data.text && (
              <Text style={styles.text} numberOfLines={2}>
                {item.data.text}
              </Text>
            )}
            <Text style={styles.status}>Estado: {labelStatus(item.data.status)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

function priorityBg(p: string): string {
  if (p === "P1") return colors.p1;
  if (p === "P2") return colors.p2;
  return colors.p3;
}
function labelStatus(s: string): string {
  return { received: "Recibido", attending: "En atención", closed: "Cerrado", dismissed: "Descartado" }[s] ?? s;
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 10 },
  h1: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { color: colors.text, fontWeight: "700" },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  text: { color: colors.textMuted, fontSize: 13 },
  status: { color: colors.textMuted, fontSize: 12 },
});
