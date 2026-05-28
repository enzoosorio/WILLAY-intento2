import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useState } from "react";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useGoogleAuth, signInDev } from "@/lib/auth";
import { env } from "@/lib/env";
import { colors } from "@/theme/colors";

export default function SignIn() {
  const { ready, needsClientIds, signIn } = useGoogleAuth();
  const [busy, setBusy] = useState(false);

  async function dev() {
    setBusy(true);
    try {
      await signInDev();
    } catch (e) {
      console.error("[sign-in] dev login", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>Willay</Text>
        <Text style={styles.subtitle}>Red ciudadana de alerta temprana</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title={ready ? "Continuar con Google" : needsClientIds ? "Google Sign-In no configurado" : "Cargando…"}
          onPress={signIn}
          disabled={!ready}
        />

        {/* Visible si emuladores ON o si Google OAuth todavía no está configurado. */}
        {(env.useEmulators || needsClientIds) && (
          <PrimaryButton
            title={env.useEmulators ? "Entrar anónimo (emulador)" : "Entrar anónimo (demo)"}
            variant="ghost"
            loading={busy}
            onPress={dev}
          />
        )}

        {needsClientIds && (
          <Text style={styles.hint}>
            Setea GOOGLE_*_CLIENT_ID en .env para activar el botón.
            Mientras tanto, usá el ingreso anónimo (emulador).
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
  hero: { flex: 1, justifyContent: "center", gap: 8 },
  brand: { color: colors.text, fontSize: 56, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 16 },
  actions: { gap: 12, marginBottom: 24 },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 4 },
  link: { color: colors.brand, textAlign: "center", marginBottom: 16, fontSize: 13 },
});
