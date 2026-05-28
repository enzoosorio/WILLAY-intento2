import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from "react-native";
import { onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { missingPersonDoc } from "@/lib/collections";
import { useAuthUser } from "@/lib/session";
import { zoneLabel } from "@/lib/zones";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc } from "@/types/models";

export default function MissingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthUser();
  const router = useRouter();
  const [data, setData] = useState<MissingPersonDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(missingPersonDoc(id), (snap) => {
      setData(snap.exists() ? (snap.data() as MissingPersonDoc) : null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Screen><ActivityIndicator color={colors.brand} /></Screen>;
  if (!data) return <Screen><Text style={{ color: colors.textMuted }}>Ficha no encontrada.</Text></Screen>;

  const isOwner = user?.uid === data.registrantUid;

  async function closeCase() {
    if (!id) return;
    setClosing(true);
    try {
      await updateDoc(missingPersonDoc(id), {
        active: false,
        embedding: null,
        closedAt: serverTimestamp(),
      } as never);
      router.back();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setClosing(false);
    }
  }

  return (
    <Screen scroll>
      {data.photoUrl ? <Image source={{ uri: data.photoUrl }} style={styles.photo} /> : null}
      <View style={styles.card}>
        <Text style={styles.name}>{data.name}, {data.age} años</Text>
        <Text style={styles.muted}>Zona: {zoneLabel(data.lastSeenZone)}</Text>
        <Text style={styles.body}>{data.description}</Text>
        <Text style={[styles.muted, { marginTop: 8 }]}>
          Estado: {data.active ? "Buscándose" : "Cerrada"}
        </Text>
      </View>

      {isOwner && data.active && (
        <PrimaryButton title="Marcar como encontrada" variant="danger" onPress={closeCase} loading={closing} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", aspectRatio: 1, borderRadius: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 6 },
  name: { color: colors.text, fontSize: 22, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 12 },
  body: { color: colors.text, fontSize: 14, marginTop: 6 },
});
