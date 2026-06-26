// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/(auth)/login.tsx
// Login sin acceso de invitado
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput, ScrollView,
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

export default function LoginScreen() {
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Image
            source={require("../../assets/images/municipalidad.jpg")}
            style={styles.bannerImg}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay} />
          <Image
            source={require("../../assets/images/logo_willay.png")}
            style={styles.bannerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.title}>Bienvenido a Willay</Text>
          <Text style={styles.sub}>Seguridad ciudadana · Puente Piedra</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
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
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
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
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.mainBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.mainBtnTxt}>INICIAR SESIÓN</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerRow}
            onPress={() => router.push("/register" as never)}
          >
            <Text style={styles.registerTxt}>
              ¿No tienes cuenta?{" "}
              <Text style={styles.registerLink}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info roles */}
        <View style={styles.rolesCard}>
          <Text style={styles.rolesTitle}>¿Qué tipo de usuario eres?</Text>
          <View style={styles.roleItem}>
            <View style={[styles.roleIcon, { backgroundColor: colors.brand + "22" }]}>
              <Ionicons name="people" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleLabel}>Vecino</Text>
              <Text style={styles.roleDesc}>Reporta incidentes y envía alertas desde tu zona</Text>
            </View>
          </View>
          <View style={styles.roleItem}>
            <View style={[styles.roleIcon, { backgroundColor: colors.warning + "22" }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleLabel}>Serenazgo</Text>
              <Text style={styles.roleDesc}>Gestiona alertas y reportes del distrito</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push("/(auth)/privacy" as never)} style={{ marginTop: 16 }}>
          <Text style={styles.privacy}>Política de privacidad</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll:    { paddingBottom: 16 },

  banner: { width: "100%", height: 220, position: "relative", marginBottom: 24 },
  bannerImg: { width: "100%", height: "100%" },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,18,32,0.55)" },
  bannerLogo: {
    position: "absolute", bottom: -50, alignSelf: "center",
    width: 140, height: 140, borderRadius: 70,
    overflow: "hidden", borderWidth: 3, borderColor: colors.brand,
  },

  form: { paddingHorizontal: 24, paddingTop: 60, gap: 12, marginBottom: 24 },

  title: { color: colors.text, fontSize: 24, fontWeight: "900", textAlign: "center" },
  sub:   { color: colors.textMuted, fontSize: 13, textAlign: "center", marginBottom: 8 },

  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, height: 56,
  },
  input: { flex: 1, color: colors.text, fontSize: 16 },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.danger + "18",
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.danger + "44",
  },
  errorTxt: { color: colors.danger, fontSize: 13, flex: 1 },

  mainBtn: {
    backgroundColor: colors.brand, borderRadius: 16,
    paddingVertical: 18, alignItems: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  mainBtnTxt: { color: "white", fontSize: 16, fontWeight: "900", letterSpacing: 1 },

  registerRow: { alignItems: "center", paddingVertical: 4 },
  registerTxt: { color: colors.textMuted, fontSize: 14 },
  registerLink:{ color: colors.brand, fontWeight: "700" },

  rolesCard: {
    marginHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 20, gap: 16,
  },
  rolesTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: 4 },
  roleItem:   { flexDirection: "row", alignItems: "center", gap: 14 },
  roleIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  roleLabel:  { color: colors.text, fontSize: 14, fontWeight: "700" },
  roleDesc:   { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  privacy: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
});