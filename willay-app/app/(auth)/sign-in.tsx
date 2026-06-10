import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { signInWithEmail } from "@/lib/auth";
import { colors } from "@/theme/colors";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "alert-circle", label: "Botón de pánico" },
  { icon: "document-text", label: "Reportar incidentes" },
  { icon: "map", label: "Mapa de incidencias" },
  { icon: "person-circle", label: "Fichas de búsqueda" },
];

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos",
  "auth/user-not-found": "No existe una cuenta con ese correo",
  "auth/wrong-password": "Contraseña incorrecta",
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos",
  "auth/invalid-email": "El correo no tiene un formato válido",
  "auth/network-request-failed": "Sin conexión. Verificá tu internet",
};

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError("");
    if (!email.trim() || !password) {
      setError("Completá los dos campos");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // _layout.tsx detecta el cambio de auth y redirige automáticamente
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(FIREBASE_ERRORS[code] ?? "Error al iniciar sesión. Intentá de nuevo.");
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

      {/* Formulario */}
      <View style={styles.form}>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(""); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Contraseña"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <PrimaryButton
          title="Iniciar sesión"
          onPress={handleSignIn}
          loading={loading}
          disabled={loading}
        />

        <TouchableOpacity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push("/(auth)/register" as any)}
          disabled={loading}
          style={styles.registerRow}
        >
          <Text style={styles.registerText}>
            ¿No tenés cuenta?{" "}
            <Text style={styles.registerLink}>Registrarse</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Separador */}
      <View style={styles.separator}>
        <View style={styles.line} />
        <Text style={styles.separatorText}>o acceso rápido</Text>
        <View style={styles.line} />
      </View>

      {/* Acceso demo */}
      <PrimaryButton
        title="Acceso demo (Administrador)"
        variant="ghost"
        onPress={() => router.push("/(auth)/role-select")}
        disabled={loading}
      />

      <Link href="/privacy" style={styles.link}>
        Política de privacidad
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.brand + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "900",
  },
  tagline: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 6,
  },
  featureCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  form: {
    gap: 10,
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    color: "#ff5c5c",
    fontSize: 13,
    marginTop: -4,
  },
  registerRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  registerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  registerLink: {
    color: colors.brand,
    fontWeight: "700",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  link: {
    color: colors.brand,
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
});
