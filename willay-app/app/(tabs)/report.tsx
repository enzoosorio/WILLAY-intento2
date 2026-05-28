// Reporte de texto (≤280 chars). Escribe reports/{id} type=text; el trigger
// on_report_create corre el classifier (reglas → Gemini) y setea priority.
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { reportsCol } from "@/lib/collections";
import { getCurrentWithGeohash } from "@/lib/location";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";

const MAX = 280;

export default function ReportText() {
  const { user } = useAuthUser();
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX) {
      Alert.alert("Reporte muy largo", `Máximo ${MAX} caracteres.`);
      return;
    }
    setSending(true);
    try {
      const loc = await getCurrentWithGeohash();
      const ref = await addDoc(reportsCol(), {
        authorUid: user.uid,
        type: "text",
        text: trimmed,
        location: loc.geopoint,
        geohash: loc.geohash,
        status: "received",
        attendedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as never);
      setText("");
      router.push({ pathname: "/report/[id]", params: { id: ref.id } });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.h1}>Reportar incidente</Text>
      <Text style={styles.muted}>Describí qué pasó, dónde y cuándo. Sé específico.</Text>

      <View style={styles.box}>
        <TextInput
          style={styles.input}
          placeholder="Ej.: dos sujetos con cuchillo cerca del parque…"
          placeholderTextColor={colors.textMuted}
          multiline
          value={text}
          onChangeText={(t) => setText(t.slice(0, MAX))}
          maxLength={MAX}
        />
        <Text style={styles.counter}>{text.length} / {MAX}</Text>
      </View>

      <PrimaryButton title="Enviar reporte" onPress={submit} loading={sending} disabled={!text.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 22, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 13 },
  box: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  input: { color: colors.text, fontSize: 15, minHeight: 140, textAlignVertical: "top" },
  counter: { color: colors.textMuted, fontSize: 11, textAlign: "right" },
});
