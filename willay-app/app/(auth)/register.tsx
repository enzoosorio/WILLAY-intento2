// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/(auth)/register.tsx
// Registro solo para vecinos — sin selección de rol
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  ActivityIndicator, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { registerWithEmail } from "@/lib/auth";
import { userDoc } from "@/lib/collections";
import { colors } from "@/theme/colors";

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/email-already-in-use":   "Ya existe una cuenta con ese correo",
  "auth/weak-password":          "La contraseña debe tener al menos 6 caracteres",
  "auth/invalid-email":          "El correo no tiene un formato válido",
  "auth/network-request-failed": "Sin conexión. Verifica tu internet",
};

type FormFields = {
  displayName: string; email: string; phone: string;
  password: string; confirmPassword: string;
};
type FormErrors = Partial<FormFields> & { general?: string };

export default function Register() {
  const [form, setForm] = useState<FormFields>({
    displayName: "", email: "", phone: "",
    password: "", confirmPassword: "",
  });
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);

  function setField(key: keyof FormFields, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, general: undefined }));
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.displayName.trim()) e.displayName = "El nombre es obligatorio";
    if (!form.email.trim())       e.email = "El correo es obligatorio";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Correo inválido";
    if (!form.password)           e.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) e.password = "Mínimo 8 caracteres";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Las contraseñas no coinciden";
    return e;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const user = await registerWithEmail(form.email.trim(), form.password, form.displayName.trim());
      await setDoc(userDoc(user.uid), {
        displayName:      form.displayName.trim(),
        email:            form.email.trim(),
        phone:            form.phone.trim() || null,
        role:             "citizen",
        zone:             null,
        expoPushTokens:   [],
        consentLocation:  false,
        consentBiometric: false,
        onboardingDone:   false,
        createdAt:        serverTimestamp(),
      } as never);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setErrors({ general: FIREBASE_ERRORS[code] ?? "Error al crear la cuenta." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Crear cuenta</Text>
          <Text style={styles.headerSub}>Registro de vecino · Puente Piedra</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: colors.brand + "22" }]}>
          <Ionicons name="people" size={14} color={colors.brand} />
          <Text style={[styles.roleBadgeTxt, { color: colors.brand }]}>Vecino</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={18} color={colors.brand} />
          <Text style={styles.infoTxt}>
            Crea tu cuenta como vecino para reportar incidentes y enviar alertas en tu zona.
          </Text>
        </View>

        {/* Nombre */}
        <Field label="Nombre completo *" error={errors.displayName}>
          <InputRow icon="person-outline">
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez"
              placeholderTextColor={colors.textMuted}
              value={form.displayName}
              onChangeText={(t) => setField("displayName", t)}
              autoCapitalize="words"
              editable={!loading}
            />
          </InputRow>
        </Field>

        {/* Email */}
        <Field label="Correo electrónico *" error={errors.email}>
          <InputRow icon="mail-outline">
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              value={form.email}
              onChangeText={(t) => setField("email", t)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </InputRow>
        </Field>

        {/* Teléfono */}
        <Field label="Teléfono (opcional)">
          <InputRow icon="call-outline">
            <TextInput
              style={styles.input}
              placeholder="987654321"
              placeholderTextColor={colors.textMuted}
              value={form.phone}
              onChangeText={(t) => setField("phone", t)}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </InputRow>
        </Field>

        {/* Contraseña */}
        <Field label="Contraseña * (mín. 8 caracteres)" error={errors.password}>
          <InputRow icon="lock-closed-outline">
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              value={form.password}
              onChangeText={(t) => setField("password", t)}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </InputRow>
        </Field>

        {/* Confirmar contraseña */}
        <Field label="Confirmar contraseña *" error={errors.confirmPassword}>
          <InputRow icon="lock-closed-outline">
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Repite la contraseña"
              placeholderTextColor={colors.textMuted}
              value={form.confirmPassword}
              onChangeText={(t) => setField("confirmPassword", t)}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
              <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </InputRow>
        </Field>

        {/* Error general */}
        {!!errors.general && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorBoxTxt}>{errors.general}</Text>
          </View>
        )}

        {/* Botón */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.submitTxt}>Creando cuenta...</Text>
            </View>
          ) : (
            <Text style={styles.submitTxt}>Crear cuenta</Text>
          )}
        </TouchableOpacity>

        {/* Info operadores */}
        <View style={styles.operatorNote}>
          <Ionicons name="shield-checkmark" size={16} color={colors.textMuted} />
          <Text style={styles.operatorNoteTxt}>
            ¿Eres personal de Serenazgo o PNP? Las cuentas de operador son creadas por el administrador del sistema.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function InputRow({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  headerSub:   { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  roleBadge:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  roleBadgeTxt:{ fontSize: 12, fontWeight: "700" },

  scroll: { padding: 20, gap: 4 },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: colors.brand + "11",
    borderWidth: 1, borderColor: colors.brand + "33",
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  infoTxt: { color: colors.textMuted, fontSize: 13, flex: 1, lineHeight: 18 },

  fieldGroup: { gap: 6, marginBottom: 12 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  fieldError: { color: colors.danger, fontSize: 12 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 52,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.danger + "18", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.danger + "44", marginBottom: 8,
  },
  errorBoxTxt: { color: colors.danger, fontSize: 13, flex: 1 },

  submitBtn: {
    backgroundColor: colors.brand, borderRadius: 16,
    paddingVertical: 18, alignItems: "center", justifyContent: "center",
    marginTop: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  submitTxt: { color: "white", fontSize: 16, fontWeight: "800" },

  operatorNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginTop: 16,
  },
  operatorNoteTxt: { color: colors.textMuted, fontSize: 12, flex: 1, lineHeight: 18 },
});