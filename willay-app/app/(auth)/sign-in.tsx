import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { signInWithGoogle, isNativeGoogleSignInAvailable } from "@/lib/google-sign-in";
import { colors } from "@/theme/colors";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "alert-circle", label: "Botón de pánico" },
  { icon: "document-text", label: "Reportar incidentes" },
  { icon: "map", label: "Mapa de incidencias" },
  { icon: "person-circle", label: "Fichas de búsqueda" },
];

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    if (!isNativeGoogleSignInAvailable) {
      Alert.alert(
        "Expo Go",
        "Google Sign-In requiere el build nativo.\nUsá 'Entrar como invitado' para probar la app."
      );
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogle();
      // El _layout.tsx detecta el cambio de auth y redirige automáticamente.
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code !== "CANCELLED") {
        Alert.alert("Error al iniciar sesión", err.message);
      }
    } finally {
      setLoading(false);
    }
  }

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
          title="Continuar con Google"
          onPress={handleGoogleSignIn}
          loading={loading}
          disabled={loading}
        />

        <PrimaryButton
          title="Entrar como invitado"
          variant="ghost"
          onPress={() => router.push("/(auth)/role-select")}
          disabled={loading}
        />
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
  link: {
    color: colors.brand,
    textAlign: "center",
    fontSize: 13,
    marginVertical: 12,
  },
});
