import { useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { registerWithEmail } from "@/lib/auth";
import { userDoc } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { Role } from "@/types/models";

const OPERATOR_CODE = "serenazgo2026";

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/email-already-in-use":   "Ya existe una cuenta con ese correo",
  "auth/weak-password":          "La contraseña debe tener al menos 6 caracteres",
  "auth/invalid-email":          "El correo no tiene un formato válido",
  "auth/network-request-failed": "Sin conexión. Verifica tu internet",
};

type FormFields = {
  displayName: string; email: string; phone: string;
  password: string; confirmPassword: string; operatorCode: string;
};
type FormErrors = Partial<FormFields> & { general?: string };

export default function Register() {
  const [step,         setStep]         = useState<1 | 2>(1);
  const [role,         setRole]         = useState<Role | null>(null);
  const [form,         setForm]         = useState<FormFields>({
    displayName: "", email: "", phone: "",
    password: "", confirmPassword: "", operatorCode: "",
  });
  const [errors,       setErrors]       = useState<FormErrors>({});
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showCode,     setShowCode]     = useState(false);
  const [loading,      setLoading]      = useState(false);

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
    if (role === "operator") {
      if (!form.operatorCode) e.operatorCode = "Código requerido";
      else if (form.operatorCode !== OPERATOR_CODE) e.operatorCode = "Código incorrecto";
    }
    return e;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const user = await registerWithEmail(form.email.trim(), form.password, form.displayName.trim());
      await setDoc(userDoc(user.uid), {
        displayName:     form.displayName.trim(),
        email:           form.email.trim(),
        phone:           form.phone.trim() || null,
        role:            role!,
        zone:            null,
        expoPushTokens:  [],
        consentLocation: false,
        consentBiometric:false,
        onboardingDone:  false,
        createdAt:       serverTimestamp(),
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
        <TouchableOpacity
          onPress={() => step === 2 ? setStep(1) : router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Crear cuenta</Text>
          <Text style={styles.headerSub}>Paso {step} de 2</Text>
        </View>
        {/* Stepper */}
        <View style={styles.stepper}>
          <View style={[styles.stepDot, { backgroundColor: colors.brand }]} />
          <View style={[styles.stepLine, step === 2 && { backgroundColor: colors.brand }]} />
          <View style={[styles.stepDot, step === 2 && { backgroundColor: colors.brand }]} />
        </View>
      </View>

      {/* PASO 1 — Selección de rol */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>¿Cuál es tu rol?</Text>
          <Text style={styles.stepDesc}>Elige cómo vas a usar Willay.</Text>

          {/* Card Vecino */}
          <Pressable
            onPress={() => setRole("citizen")}
            style={[styles.roleCard, role === "citizen" && { borderColor: colors.brand, backgroundColor: colors.brand + "0D" }]}
          >
            <View style={[styles.roleIcon, { backgroundColor: colors.brand + "22" }]}>
              <Ionicons name="people" size={32} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, role === "citizen" && { color: colors.brand }]}>Vecino</Text>
              <Text style={styles.roleDesc}>Reporta incidentes y envía alertas de pánico desde tu zona.</Text>
              <View style={styles.featureList}>
                {["Botón de pánico rápido", "Reportar incidentes", "Seguimiento de reportes"].map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={13} color={role === "citizen" ? colors.brand : colors.textMuted} />
                    <Text style={[styles.featureTxt, role === "citizen" && { color: colors.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
            {role === "citizen" && (
              <View style={[styles.checkBadge, { backgroundColor: colors.brand }]}>
                <Ionicons name="checkmark" size={14} color="white" />
              </View>
            )}
          </Pressable>

          {/* Card Operador */}
          <Pressable
            onPress={() => setRole("operator")}
            style={[styles.roleCard, role === "operator" && { borderColor: colors.warning, backgroundColor: colors.warning + "0D" }]}
          >
            <View style={[styles.roleIcon, { backgroundColor: colors.warning + "22" }]}>
              <Ionicons name="shield-checkmark" size={32} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, role === "operator" && { color: colors.warning }]}>Operador / Serenazgo</Text>
              <Text style={styles.roleDesc}>Gestiona reportes y monitorea incidencias de la comunidad.</Text>
              <View style={styles.featureList}>
                {["Bandeja de alertas P1/P2/P3", "Dashboard con estadísticas", "Mapa de incidencias"].map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={13} color={role === "operator" ? colors.warning : colors.textMuted} />
                    <Text style={[styles.featureTxt, role === "operator" && { color: colors.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
            {role === "operator" && (
              <View style={[styles.checkBadge, { backgroundColor: colors.warning }]}>
                <Ionicons name="checkmark" size={14} color="white" />
              </View>
            )}
          </Pressable>

          <View style={{ height: 16 }} />
        </ScrollView>
      )}

      {/* PASO 2 — Formulario */}
      {step === 2 && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepTitle}>Tus datos</Text>
          <Text style={styles.stepDesc}>
            {role === "operator" ? "Registro como Operador / Serenazgo" : "Registro como Vecino"}
          </Text>

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

          {role === "operator" && (
            <Field label="Código de acceso de operador *" error={errors.operatorCode}>
              <InputRow icon="key-outline">
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Código del administrador"
                  placeholderTextColor={colors.textMuted}
                  value={form.operatorCode}
                  onChangeText={(t) => setField("operatorCode", t)}
                  secureTextEntry={!showCode}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowCode(v => !v)}>
                  <Ionicons name={showCode ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </InputRow>
            </Field>
          )}

          {!!errors.general && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorBoxTxt}>{errors.general}</Text>
            </View>
          )}

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

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Footer botón siguiente (solo paso 1) */}
      {step === 1 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, !role && { opacity: 0.4 }]}
            onPress={() => role && setStep(2)}
            disabled={!role}
            activeOpacity={0.85}
          >
            <Text style={styles.submitTxt}>Siguiente</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}
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
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  stepLine:{ width: 20, height: 2, backgroundColor: colors.border },

  scroll: { padding: 20, gap: 4 },
  stepTitle: { color: colors.text, fontSize: 24, fontWeight: "900", marginBottom: 4 },
  stepDesc:  { color: colors.textMuted, fontSize: 14, marginBottom: 16 },

  roleCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 2, borderColor: colors.border,
    padding: 16, flexDirection: "row", gap: 14, marginBottom: 12,
    position: "relative",
  },
  roleIcon:  { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  roleTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginBottom: 4 },
  roleDesc:  { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  featureList: { gap: 4 },
  featureRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  featureTxt:  { color: colors.textMuted, fontSize: 12 },
  checkBadge: {
    position: "absolute", top: 12, right: 12,
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },

  fieldGroup: { gap: 6, marginBottom: 8 },
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
    paddingVertical: 18, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  submitTxt: { color: "white", fontSize: 16, fontWeight: "800" },

  footer: {
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});