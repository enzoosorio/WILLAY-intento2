// Tab Pánico: botón long-press 2s con haptic, escribe reports/{id} type=panic.
// La Cloud Function on_report_create se encarga del fan-out push.
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { addDoc, serverTimestamp } from "firebase/firestore";
import * as Haptics from "expo-haptics";

import { Screen } from "@/components/ui/Screen";
import { reportsCol } from "@/lib/collections";
import { getCurrentWithGeohash } from "@/lib/location";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";

const HOLD_MS = 2000;

export default function Panic() {
  const { user } = useAuthUser();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
  }, []);

  function startHold() {
    if (sending || !user) return;
    setHolding(true);
    setProgress(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const startedAt = Date.now();
    tick.current = setInterval(() => {
      setProgress(Math.min(1, (Date.now() - startedAt) / HOLD_MS));
    }, 50);
    timer.current = setTimeout(fire, HOLD_MS);
  }

  function cancelHold() {
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
    setHolding(false);
    setProgress(0);
  }

  async function fire() {
    cancelHold();
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      if (!user) throw new Error("No autenticado");
      const loc = await getCurrentWithGeohash();
      await addDoc(reportsCol(), {
        authorUid: user.uid,
        type: "panic",
        location: loc.geopoint,
        geohash: loc.geohash,
        status: "received",
        attendedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as never);
      setLastSent(new Date().toLocaleTimeString());
    } catch (e) {
      Alert.alert("No se pudo enviar la alerta", (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Botón de pánico</Text>
        <Text style={styles.subtitle}>Mantener presionado 2 segundos para enviar.</Text>
      </View>

      <View style={styles.center}>
        <Pressable
          onPressIn={startHold}
          onPressOut={cancelHold}
          style={({ pressed }) => [
            styles.btn,
            { transform: [{ scale: pressed || holding ? 0.97 : 1 }] },
          ]}
        >
          <View style={[styles.ring, { width: 220 - progress * 30, height: 220 - progress * 30 }]} />
          <Text style={styles.btnText}>{sending ? "Enviando…" : "PÁNICO"}</Text>
        </Pressable>
        {lastSent && <Text style={styles.lastSent}>Última alerta enviada: {lastSent}</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  btn: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 4,
    borderColor: colors.brandSoft,
    opacity: 0.4,
  },
  btnText: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: 1.2 },
  lastSent: { color: colors.textMuted, fontSize: 12 },
});
