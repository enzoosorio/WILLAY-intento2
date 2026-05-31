// ════════════════════════════════════════════════════════════════════
// ARCHIVO 2 de 7
// UBICACIÓN:  willay-app/app/(auth)/sign-in.tsx
// ════════════════════════════════════════════════════════════════════
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useGoogleAuth } from "@/lib/auth";
import { colors } from "@/theme/colors";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "alert-circle", label: "Botón de pánico" },
  { icon: "document-text", label: "Reportar incidentes" },
  { icon: "map", label: "Mapa de incidencias" },
  { icon: "person-circle", label: "Fichas de búsqueda" },
];

export default function SignIn() {
  const { ready, needsClientIds, signIn } = useGoogleAuth();

  return (
    <Screen>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name="shield-checkmark" size={50} color={colors.text} />
          </View>
        </View>

        <Text style={styles.brand}>Willay</Text>
        <Text style={styles.tagline}>RED CIUDADANA DE ALERTA TEMPRANA</Text>
        <Text style={styles.desc}>
          Protege tu comunidad. Reporta, alerta y actúa en tiempo real.
        </Text>
      </View>

      {/* Características */}
      <View style={styles.featureGrid}>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureCard}>
            <Ionicons name={f.icon} size={22} color={colors.brand} />
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      {/* Botones */}
      <View style={styles.actions}>
        <PrimaryButton
          title={
            ready
              ? "Continuar con Google"
              : needsClientIds
              ? "Google Sign-In no configurado"
              : "Cargando…"
          }
          onPress={signIn}
          disabled={!ready}
        />

        <PrimaryButton
          title="Entrar como invitado"
          variant="ghost"
          onPress={() => router.push("/(auth)/role-select")}
        />

        {needsClientIds && (
          <Text style={styles.hint}>
            Configura GOOGLE_*_CLIENT_ID en .env para activar Google Sign-In.
          </Text>
        )}
      </View>

      <Link href="/privacy" style={styles.link}>
        Política de privacidad
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.brand + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: colors.text,
    fontSize: 46,
    fontWeight: "900",
  },
  tagline: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 8,
  },
  featureCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  link: {
    color: colors.brand,
    textAlign: "center",
    fontSize: 13,
    marginVertical: 12,
  },
});