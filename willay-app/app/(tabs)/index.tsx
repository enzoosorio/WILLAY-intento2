// ════════════════════════════════════════════════════════════════════
// UBICACIÓN:  willay-app/app/(tabs)/index.tsx
// Pantalla principal del VECINO — diseño accesible para adultos mayores
// Grid de categorías + Alerta Rápida (pánico)
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { addDoc, serverTimestamp } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { signInAnonymously } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";

import { getFirebaseAuth, getDb } from "../../lib/firebase";
import { Screen } from "../../components/ui/Screen";
import { reportsCol } from "../../lib/collections";
import { getCurrentWithGeohash } from "../../lib/location";
import { useAuthUser, useUserDoc } from "../../lib/session";
import { colors } from "../../theme/colors";

const HOLD_MS = 2000;
const EMERGENCY_CONTACTS = [
  { label: "Serenazgo",  number: "012196220", display: "(01) 219-6220", icon: "shield-checkmark" as const, color: "#1A3A6B" },
  { label: "Policía",   number: "105",        display: "105",            icon: "person"           as const, color: "#1A3A6B" },
  { label: "Bomberos",  number: "116",        display: "116",            icon: "flame"            as const, color: colors.brand },
];

type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  incidentType: string;
};

const CATEGORIES: Category[] = [
  { id: "extorsion",    label: "Extorsión",   icon: "phone-portrait", incidentType: "otro" },
  { id: "robo",         label: "Robo",         icon: "card",           incidentType: "robo" },
  { id: "salud",        label: "Salud",        icon: "medkit",         incidentType: "accidente" },
  { id: "incendio",     label: "Incendio",     icon: "flame",          incidentType: "otro" },
  { id: "rescate",      label: "Rescate",      icon: "shield",         incidentType: "otro" },
  { id: "violencia",    label: "Violencia",    icon: "hand-left",      incidentType: "violencia_familiar" },
  { id: "desaparecida", label: "Desaparecida", icon: "person-circle",  incidentType: "otro" },
  { id: "otros",        label: "Otros",        icon: "grid",           incidentType: "otro" },
];

export default function Home() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const auth = getFirebaseAuth();
  const router = useRouter();

  const [sending, setSending] = useState(false);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
  }, []);

  if (profile?.role === "operator") {
    return <Redirect href="/(tabs)/operator" />;
  }

  // ── Alerta Rápida (pánico) ──
  function startHold() {
    if (sending) return;
    setHolding(true);
    setProgress(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const startedAt = Date.now();
    tick.current = setInterval(() => {
      setProgress(Math.min(1, (Date.now() - startedAt) / HOLD_MS));
    }, 50);
    timer.current = setTimeout(firePanic, HOLD_MS);
  }

  function cancelHold() {
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
    setHolding(false);
    setProgress(0);
  }

  async function firePanic() {
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

  // ── Reporte por categoría ──
  function handleCategory(cat: Category) {
    if (cat.id === "desaparecida") {
      router.push("/missing/new");
      return;
    }
    router.push({ pathname: "/(tabs)/report", params: { incidentType: cat.incidentType, categoryLabel: cat.label } });
  }

  // ── Llamada de emergencia ──
  function callNumber(label: string, number: string, display: string) {
    Alert.alert(
      `Llamar a ${label}`,
      `¿Llamar al ${display}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Llamar", onPress: () => Linking.openURL(`tel:${number}`) },
      ]
    );
  }

  const firstName = profile?.displayName?.split(" ")[0] ?? "vecino";

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Saludo ── */}
        <View style={styles.headerWrap}>
          <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
          <Text style={styles.subGreeting}>Ayúdanos a denunciar</Text>
        </View>

        {/* ── Botón Alerta Rápida ── */}
        <Pressable
          onPressIn={startHold}
          onPressOut={cancelHold}
          disabled={sending}
          style={({ pressed }) => [
            styles.alertBtn,
            (pressed || holding) && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          {sending ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <>
              <Ionicons name="alarm" size={32} color="white" />
              <Text style={styles.alertBtnText}>
                {holding ? `Enviando… ${Math.round(progress * 100)}%` : "Alerta Rápida"}
              </Text>
            </>
          )}
        </Pressable>

        {lastSent && (
          <View style={styles.sentBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.sentText}>Alerta enviada · {lastSent}</Text>
          </View>
        )}

        {/* ── Categorías ── */}
        <Text style={styles.sectionTitle}>Categorías</Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [styles.catCard, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
              onPress={() => handleCategory(cat)}
            >
              <Ionicons name={cat.icon} size={36} color="white" />
              <Text style={styles.catLabel}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Números de emergencia ── */}
        <Text style={styles.sectionTitle}>Emergencias</Text>
        <View style={styles.grid}>
          {EMERGENCY_CONTACTS.map((e) => (
            <Pressable
              key={e.label}
              style={({ pressed }) => [styles.catCard, { backgroundColor: e.color }, pressed && { opacity: 0.8 }]}
              onPress={() => callNumber(e.label, e.number, e.display)}
            >
              <Ionicons name={e.icon} size={36} color="white" />
              <Text style={styles.catLabel}>{e.display}</Text>
              <Text style={styles.emergencyLabel}>{e.label.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const CAT_COLOR = "#1A3A6B"; // azul oscuro para las cards de categoría

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Saludo
  headerWrap: {
    marginBottom: 20,
  },
  greeting: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  subGreeting: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 4,
  },

  // Alerta rápida
  alertBtn: {
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  alertBtnText: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  sentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.success,
    marginBottom: 16,
  },
  sentText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "600",
  },

  // Sección
  sectionTitle: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    marginTop: 4,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  catCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: CAT_COLOR,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  catLabel: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  emergencyCard: {
    backgroundColor: colors.brand,
  },
  emergencyLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
});