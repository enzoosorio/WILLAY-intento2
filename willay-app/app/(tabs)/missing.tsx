// ════════════════════════════════════════════════════════════════════
// Feed de personas desaparecidas/buscadas — diseño profesional
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { activeMissingQuery } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc, PersonCategory } from "@/types/models";

type Row = { id: string; data: MissingPersonDoc };

export default function MissingFeed() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<PersonCategory>("perdida");
  const router = useRouter();

  useEffect(() => {
    return onSnapshot(activeMissingQuery(), (snap) =>
      setRows(snap.docs.map((d: QueryDocumentSnapshot<MissingPersonDoc>) => ({ id: d.id, data: d.data() })))
    );
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => (r.data.category ?? "perdida") === tab),
    [rows, tab]
  );

  const countPerdidas = rows.filter((r) => (r.data.category ?? "perdida") === "perdida").length;
  const countBuscadas = rows.filter((r) => r.data.category === "buscada").length;
  const isBuscada = tab === "buscada";

  return (
    <Screen padded={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Personas</Text>
          <Text style={styles.headerSub}>{rows.length} fichas activas</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/missing/new")}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addBtnTxt}>Reportar</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("perdida")}
          style={[styles.tab, tab === "perdida" && { borderBottomColor: colors.brand }]}
        >
          <Ionicons name="help-buoy" size={16} color={tab === "perdida" ? colors.brand : colors.textMuted} />
          <Text style={[styles.tabTxt, tab === "perdida" && { color: colors.text }]}>
            Perdidas ({countPerdidas})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("buscada")}
          style={[styles.tab, tab === "buscada" && { borderBottomColor: colors.danger }]}
        >
          <Ionicons name="alert-circle" size={16} color={tab === "buscada" ? colors.danger : colors.textMuted} />
          <Text style={[styles.tabTxt, tab === "buscada" && { color: colors.text }]}>
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
            <Ionicons name={isBuscada ? "shield-checkmark" : "happy"} size={52} color={colors.border} />
            <Text style={styles.emptyTxt}>
              {isBuscada ? "No hay personas buscadas." : "No hay personas perdidas."}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/missing/new")}>
              <Text style={styles.emptyBtnTxt}>+ Crear ficha</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const buscada = item.data.category === "buscada";
          const accentColor = buscada ? colors.danger : colors.brand;
          return (
            <Link href={{ pathname: "/missing/[id]", params: { id: item.id } }} asChild>
              <Pressable style={[styles.card, { borderLeftColor: accentColor }]}>
                {/* Foto */}
                {item.data.photoUrl ? (
                  <Image source={{ uri: item.data.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={30} color={colors.textMuted} />
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.data.name}</Text>
                    <View style={[styles.badge, { backgroundColor: accentColor }]}>
                      <Text style={styles.badgeTxt}>{buscada ? "BUSCADA" : "PERDIDA"}</Text>
                    </View>
                  </View>
                  <Text style={styles.age}>{item.data.age} años · {item.data.lastSeenZone}</Text>
                  <Text style={styles.desc} numberOfLines={2}>{item.data.description}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.border} />
              </Pressable>
            </Link>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { color: colors.text, fontSize: 26, fontWeight: "900" },
  headerSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addBtnTxt: { color: "white", fontWeight: "700", fontSize: 14 },

  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 20 },
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
  tabTxt: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },

  list: { padding: 16, gap: 12 },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyTxt: { color: colors.textMuted, fontSize: 15, textAlign: "center" },
  emptyBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  emptyBtnTxt: { color: "white", fontWeight: "700" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: 14,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.surfaceAlt },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: colors.text, fontSize: 16, fontWeight: "800", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { color: "white", fontSize: 10, fontWeight: "800" },
  age: { color: colors.textMuted, fontSize: 12 },
  desc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});