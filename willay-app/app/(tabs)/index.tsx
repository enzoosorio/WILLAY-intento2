// ════════════════════════════════════════════════════════════════════
// UBICACIÓN:  willay-app/app/(tabs)/index.tsx
// (Pantalla de Botón de Pánico — Vecino)
//
// Si el usuario es ADMIN, lo redirige automáticamente a su panel.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { addDoc, serverTimestamp } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { signInAnonymously } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";

import { getFirebaseAuth, getDb } from "../../lib/firebase";
import { Screen } from "../../components/ui/Screen";
import { reportsCol } from "../../lib/collections";
import { getCurrentWithGeohash } from "../../lib/location";
import { useAuthUser, useUserDoc } from "../../lib/session";
import { colors } from "../../theme/colors";

const HOLD_MS = 2000;

export default function Panic() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const auth = getFirebaseAuth();

  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [loadingGuest, setLoadingGuest] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
  }, []);

  // --- LÓGICA DE INVITADO ---
  async function handleGuestLogin() {
    setLoadingGuest(true);
    try {
      await signInAnonymously(auth);
    } catch (e) {
      Alert.alert("Error", "No se pudo iniciar sesión de prueba.");
    } finally {
      setLoadingGuest(false);
    }
  }

  // --- LÓGICA DE PÁNICO ---
  function startHold() {
    if (sending) return;
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
      let currentUser = user;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }
      if (!currentUser) throw new Error("No autenticado");

      const loc = await getCurrentWithGeohash();
      await addDoc(reportsCol(), {
        authorUid: currentUser.uid,
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

  // --- REDIRECT ADMIN (después de todos los hooks, posición segura) ---
  // El admin (serenazgo/policía) no usa pánico → va a su panel de Alertas.
  if (profile?.role === "operator") {
    return <Redirect href="/(tabs)/operator" />;
  }

  // --- Pantalla cuando NO hay usuario ---
  if (!user) {
    return (
      <Screen>
        <View style={styles.guestWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={48} color={colors.text} />
          </View>
          <Text style={styles.brand}>Willay</Text>
          <Text style={styles.subtitle}>Sistema de Seguridad Ciudadana</Text>

          <Pressable
            style={({ pressed }) => [styles.btnGuest, pressed && { opacity: 0.85 }]}
            onPress={handleGuestLogin}
          >
            {loadingGuest ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnTextGuest}>Entrar como Invitado</Text>
            )}
          </Pressable>
        </View>
      </Screen>
    );
  }

  // --- Pantalla de Pánico ---
  const ringSize = 230 - progress * 20;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="warning" size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Botón de pánico</Text>
          <Text style={styles.subtitle}>
            Mantén presionado 2 segundos para enviar una alerta.
          </Text>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.haloOuter} />
        <View style={styles.haloMid} />

        <Pressable
          onPressIn={startHold}
          onPressOut={cancelHold}
          disabled={sending}
          style={({ pressed }) => [
            styles.btn,
            { transform: [{ scale: pressed || holding ? 0.96 : 1 }] },
          ]}
        >
          <View
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                opacity: holding ? 0.4 + progress * 0.6 : 0.35,
              },
            ]}
          />
          {sending ? (
            <ActivityIndicator size="large" color={colors.text} />
          ) : (
            <>
              <Ionicons name="alert-circle" size={42} color={colors.text} style={{ marginBottom: 4 }} />
              <Text style={styles.btnText}>
                {holding ? `${Math.round(progress * 100)}%` : "PÁNICO"}
              </Text>
            </>
          )}
        </Pressable>

        {lastSent && (
          <View style={styles.sentBadge}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success} />
            <Text style={styles.sentText}>Alerta enviada · {lastSent}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="location" size={18} color={colors.brand} />
        <Text style={styles.infoText}>
          Tu ubicación se envía automáticamente junto con la alerta.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brand + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  haloOuter: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.brand + "0D",
  },
  haloMid: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.brand + "14",
  },
  btn: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 14,
  },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 5, borderColor: colors.brandSoft },
  btnText: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: 1.4 },
  sentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.success,
  },
  sentText: { color: colors.success, fontSize: 12, fontWeight: "600" },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  infoText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },

  guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  brand: { color: colors.text, fontSize: 40, fontWeight: "900" },
  btnGuest: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: "85%",
    alignItems: "center",
    marginTop: 24,
  },
  btnTextGuest: { color: "white", fontWeight: "700", fontSize: 15 },
});