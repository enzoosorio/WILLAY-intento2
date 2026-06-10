// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/login.tsx
// Pantalla de login principal
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput, ScrollView,
} from "react-native";
import { signInAnonymously } from "firebase/auth";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getFirebaseAuth } from "@/lib/firebase";
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
  const auth = getFirebaseAuth();
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

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

  async function handleGuestLogin() {
    setLoadingGuest(true);
    try {
      await signInAnonymously(auth);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "No se pudo iniciar sesión.");
    } finally {
      setLoadingGuest(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner superior estilo municipalidad */}
        <View style={styles.banner}>
          <Image
            source={require("../../assets/images/municipalidad.jpg")}
            style={styles.bannerImg}
            resizeMode="cover"
          />
          {/* Overlay oscuro */}
          <View style={styles.bannerOverlay} />
          {/* Logo encima */}
          <Image
            source={require("../../assets/images/logo_willay.png")}
            style={styles.bannerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Formulario */}
        <View style={[styles.form, { paddingHorizontal: 24, paddingTop: 60 }]}>
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

          {/* Botón INICIAR */}
          <TouchableOpacity
            style={[styles.mainBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading || loadingGuest}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.mainBtnTxt}>INICIAR</Text>
            )}
          </TouchableOpacity>

          {/* Registro */}
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

        {/* Separador */}
        <View style={[styles.separator, { paddingHorizontal: 24 }]}>
          <View style={styles.line} />
          <Text style={styles.separatorTxt}>o continúa sin cuenta</Text>
          <View style={styles.line} />
        </View>

        {/* Entrar como invitado */}
        <View style={{ paddingHorizontal: 24 }}>
        <TouchableOpacity
          style={[styles.guestBtn, loadingGuest && { opacity: 0.7 }]}
          onPress={handleGuestLogin}
          disabled={loading || loadingGuest}
          activeOpacity={0.85}
        >
          {loadingGuest ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <Text style={styles.guestBtnTxt}>Entrar como invitado</Text>
            </>
          )}
        </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/privacy")} style={{ marginTop: 16 }}>
          <Text style={styles.privacy}>Política de privacidad</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 16 },

  // Banner
  banner: {
    width: "100%",
    height: 220,
    position: "relative",
    marginBottom: 24,
  },
  bannerImg: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,18,32,0.55)",
  },
  bannerLogo: {
    position: "absolute",
    bottom: -50,
    alignSelf: "center",
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: colors.brand,
  },

  // Form
  form: { gap: 12, marginBottom: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 56,
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
  mainBtnTxt: { color: "white", fontSize: 17, fontWeight: "900", letterSpacing: 1 },

  registerRow: { alignItems: "center", paddingVertical: 2 },
  registerTxt: { color: colors.textMuted, fontSize: 14 },
  registerLink: { color: colors.brand, fontWeight: "700" },

  // Separador
  separator: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorTxt: { color: colors.textMuted, fontSize: 12 },

  // Invitado
  guestBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingVertical: 16,
    marginBottom: 10,
  },
  guestBtnTxt: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },

  // Demo
  demoBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, marginBottom: 16,
  },
  demoBtnTxt: { color: colors.textMuted, fontSize: 13 },

  privacy: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
});