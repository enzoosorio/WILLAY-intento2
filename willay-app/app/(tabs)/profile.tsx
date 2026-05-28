import { Alert, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { signOut } from "@/lib/auth";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { zoneLabel } from "@/lib/zones";
import { env } from "@/lib/env";
import { panicEcho } from "@/lib/functions";
import { colors } from "@/theme/colors";
import { useState } from "react";

export default function Profile() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const [warming, setWarming] = useState(false);

  async function warm() {
    setWarming(true);
    try {
      const r = await panicEcho()({});
      Alert.alert("Function lista", `warm=${r.data.warm} · ts=${r.data.ts}`);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setWarming(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.h1}>Perfil</Text>

      <View style={styles.card}>
        <Row label="Nombre" value={profile?.displayName ?? "—"} />
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Rol" value={profile?.role ?? "—"} />
        <Row label="Zona" value={zoneLabel(profile?.zone)} />
        <Row label="Push tokens" value={String(profile?.expoPushTokens?.length ?? 0)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHead}>Diagnóstico</Text>
        <Row label="Emuladores" value={env.useEmulators ? "ON" : "OFF"} />
        <Row label="Host emu" value={env.emulatorHost} />
        <Row label="Región" value={env.region} />
        <Row label="Project" value={env.firebase.projectId || "—"} />
        <Row label="FaceNet" value={env.useFacenet ? "ON" : "OFF (mock)"} />
        <PrimaryButton title="Calentar Cloud Function" onPress={warm} loading={warming} variant="ghost" />
      </View>

      <Link href="/privacy" style={styles.link}>
        Política de privacidad
      </Link>

      <PrimaryButton title="Cerrar sesión" variant="danger" onPress={() => signOut()} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowL}>{label}</Text>
      <Text style={styles.rowV} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 22, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHead: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowL: { color: colors.textMuted, fontSize: 13 },
  rowV: { color: colors.text, fontSize: 13, flexShrink: 1, textAlign: "right" },
  link: { color: colors.brand, textAlign: "center", fontSize: 13 },
});
