// Feed de fichas — separado en "Perdidas" y "Buscadas/Delincuentes".
import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { activeMissingQuery } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc, PersonCategory } from "@/types/models";

type Row = { id: string; data: MissingPersonDoc };

export default function MissingFeed() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<PersonCategory>("perdida");

  useEffect(() => {
    return onSnapshot(activeMissingQuery(), (snap) =>
      setRows(
        snap.docs.map((d: QueryDocumentSnapshot<MissingPersonDoc>) => ({
          id: d.id,
          data: d.data(),
        })),
      ),
    );
  }, []);

  // Filtrar por categoría. Las fichas sin categoría (viejas) se muestran en "Perdidas".
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const cat = r.data.category ?? "perdida";
        return cat === tab;
      }),
    [rows, tab],
  );

  const countPerdidas = rows.filter((r) => (r.data.category ?? "perdida") === "perdida").length;
  const countBuscadas = rows.filter((r) => r.data.category === "buscada").length;

  const isBuscada = tab === "buscada";
  const accent = isBuscada ? colors.p1 : colors.brand;

  return (
    <Screen padded={false}>
      {/* Botón de acción: solo registrar (escanear es del admin) */}
      <View style={styles.actions}>
        <Link href="/missing/new" asChild>
          <Pressable style={[styles.action, { backgroundColor: colors.brand }]}>
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={styles.actionText}>Reportar persona</Text>
          </Pressable>
        </Link>
      </View>

      {/* Pestañas Perdidas / Buscadas */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("perdida")}
          style={[styles.tab, tab === "perdida" && { borderBottomColor: colors.brand }]}
        >
          <Ionicons
            name="help-buoy"
            size={16}
            color={tab === "perdida" ? colors.brand : colors.textMuted}
          />
          <Text style={[styles.tabText, tab === "perdida" && { color: colors.text }]}>
            Perdidas ({countPerdidas})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("buscada")}
          style={[styles.tab, tab === "buscada" && { borderBottomColor: colors.p1 }]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color={tab === "buscada" ? colors.p1 : colors.textMuted}
          />
          <Text style={[styles.tabText, tab === "buscada" && { color: colors.text }]}>
            Buscadas ({countBuscadas})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name={isBuscada ? "shield-checkmark" : "happy"}
              size={44}
              color={colors.textMuted}
            />
            <Text style={styles.empty}>
              {isBuscada
                ? "No hay personas buscadas registradas."
                : "No hay personas perdidas registradas."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/missing/[id]", params: { id: item.id } }} asChild>
            <Pressable style={[styles.card, isBuscada && { borderColor: colors.p1 + "55" }]}>
              {item.data.photoUrl ? (
                <Image source={{ uri: item.data.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={28} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>
                    {item.data.name}, {item.data.age} años
                  </Text>
                  {isBuscada && (
                    <View style={styles.wantedTag}>
                      <Ionicons name="warning" size={10} color="#fff" />
                      <Text style={styles.wantedTagText}>BUSCADO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.desc} numberOfLines={2}>
                  {item.data.description}
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, padding: 20, paddingBottom: 12 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionText: { color: colors.text, fontWeight: "700" },

  // Pestañas
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },

  list: { padding: 20, gap: 10 },
  emptyWrap: { alignItems: "center", marginTop: 50, gap: 10 },
  empty: { color: colors.textMuted, textAlign: "center", fontSize: 14 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { color: colors.text, fontWeight: "700" },
  wantedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.p1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wantedTagText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});