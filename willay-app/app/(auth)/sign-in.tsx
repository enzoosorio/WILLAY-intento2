// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/(auth)/sign-in.tsx
// Pantalla de inicio de sesión con email/contraseña
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { signInWithEmail } from "@/lib/auth";
import { colors } from "@/theme/colors";

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/invalid-credential":     "Correo o contraseña incorrectos",
  "auth/user-not-found":         "No existe una cuenta con ese correo",
  "auth/wrong-password":         "Contraseña incorrecta",
  "auth/too-many-requests":      "Demasiados intentos. Espera unos minutos",
  "auth/invalid-email":          "El correo no tiene un formato válido",
  "auth/network-request-failed": "Sin conexión. Verifica tu internet",
};

export default function SignIn() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  async function handleSignIn() {
    setError("");
    if (!email.trim() || !password) { setError("Completa los dos campos"); return; }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(FIREBASE_ERRORS[code] ?? "Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/login")}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={28} color="white" />
          </View>
          <Text style={styles.brand}>Willay</Text>
        </View>

        <Text style={styles.title}>Bienvenido de vuelta</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar protegiendo tu comunidad</Text>

        {/* Formulario */}
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
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
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
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
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitTxt}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerRow}
            onPress={() => router.push("/(auth)/register" as never)}
            disabled={loading}
          >
            <Text style={styles.registerTxt}>
              ¿No tienes cuenta?{" "}
              <Text style={styles.registerLink}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Separador */}
        <View style={styles.separator}>
          <View style={styles.line} />
          <Text style={styles.separatorTxt}>o acceso rápido</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.demoBtn}
          onPress={() => router.push("/(auth)/role-select")}
        >
          <Ionicons name="shield" size={16} color={colors.textMuted} />
          <Text style={styles.demoBtnTxt}>Acceso demo (Administrador)</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 56 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
  },

  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  logoCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  brand: { color: colors.text, fontSize: 28, fontWeight: "900" },

  title: { color: colors.text, fontSize: 26, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 28 },

  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 54,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.danger + "18",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.danger + "44",
  },
  errorTxt: { color: colors.danger, fontSize: 13, flex: 1 },

  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  submitTxt: { color: "white", fontSize: 16, fontWeight: "800" },

  registerRow: { alignItems: "center", paddingVertical: 4 },
  registerTxt: { color: colors.textMuted, fontSize: 14 },
  registerLink: { color: colors.brand, fontWeight: "700" },

  separator: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorTxt: { color: colors.textMuted, fontSize: 12 },

  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
  },
  demoBtnTxt: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
});