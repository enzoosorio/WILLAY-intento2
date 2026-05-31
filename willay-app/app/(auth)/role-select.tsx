// ════════════════════════════════════════════════════════════════════
// ARCHIVO 3 de 7
// UBICACIÓN:  willay-app/app/(auth)/role-select.tsx
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { signInAnonymously } from "firebase/auth";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { getFirebaseAuth } from "@/lib/firebase";
import { userDoc } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { Role } from "@/types/models";

type Option = {
  role: Role;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  accent: string;
  features: string[];
};

const OPTIONS: Option[] = [
  {
    role: "citizen",
    icon: "people",
    title: "Vecino",
    desc: "Reporta incidencias y envía alertas de pánico desde tu zona.",
    accent: colors.brand,
    features: [
      "Botón de pánico rápido",
      "Reportar incidentes con texto",
      "Ver fichas de personas buscadas",
      "Seguimiento de tus reportes",
    ],
  },
  {
    role: "operator",
    icon: "shield-checkmark",
    title: "Administrador",
    desc: "Gestiona reportes y monitorea incidencias de la comunidad.",
    accent: colors.warning,
    features: [
      "Bandeja de alertas en tiempo real",
      "Dashboard con estadísticas",
      "Mapa de incidencias",
      "Cambiar estado de reportes",
    ],
  },
];

export default function RoleSelect() {
  const [selected, setSelected] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!selected) return;
    setSaving(true);
    try {
      const auth = getFirebaseAuth();
      const { user } = await signInAnonymously(auth);

      // Documento nuevo → setDoc SIN merge (las rules solo permiten create)
      await setDoc(userDoc(user.uid), {
        displayName: selected === "operator" ? "Administrador" : "Vecino",
        zone: "otros",
        role: selected,
        expoPushTokens: [],
        consentLocation: false,
        consentBiometric: false,
        onboardingDone: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as never);
      // El _layout redirige automáticamente a /(tabs)
    } catch (e) {
      const msg = (e as Error).message ?? "Error desconocido";
      Alert.alert(
        "No se pudo ingresar",
        `Revisa tu conexión e intenta de nuevo.\n\nDetalle: ${msg}`,
      );
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>Willay</Text>
        <Text style={styles.subtitle}>¿Cómo deseas ingresar?</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.cards}
        showsVerticalScrollIndicator={false}
      >
        {OPTIONS.map((opt) => {
          const active = selected === opt.role;
          return (
            <Pressable
              key={opt.role}
              onPress={() => setSelected(opt.role)}
              style={[
                styles.card,
                active && {
                  borderColor: opt.accent,
                  backgroundColor: colors.surfaceAlt,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: opt.accent + "22" }]}>
                <Ionicons name={opt.icon} size={32} color={opt.accent} />
              </View>

              <Text style={[styles.cardTitle, active && { color: opt.accent }]}>
                {opt.title}
              </Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>

              <View style={styles.featureList}>
                {opt.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={active ? opt.accent : colors.textMuted}
                    />
                    <Text
                      style={[styles.featureText, active && { color: colors.text }]}
                    >
                      {f}
                    </Text>
                  </View>
                ))}
              </View>

              {active && (
                <View style={[styles.check, { backgroundColor: opt.accent }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
          onPress={confirm}
          disabled={!selected || saving}
          style={[styles.btn, (!selected || saving) && styles.btnDisabled]}
        >
          {saving ? (
            <View style={styles.btnInner}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.btnText}>Ingresando…</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>
              {selected
                ? `Entrar como ${selected === "citizen" ? "Vecino" : "Administrador"}`
                : "Selecciona un rol"}
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 8, gap: 4, marginBottom: 18 },
  brand: { color: colors.text, fontSize: 36, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 16 },
  cards: { gap: 14, paddingBottom: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
    position: "relative",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  cardDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  featureList: { gap: 5, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  featureText: { color: colors.textMuted, fontSize: 12 },
  check: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bottom: { paddingTop: 16, paddingBottom: 4 },
  btn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});