import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { registerWithEmail } from "@/lib/auth";
import { userDoc } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { Role } from "@/types/models";

const OPERATOR_ACCESS_CODE = "serenazgo2026";

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
  "auth/invalid-email": "El correo no tiene un formato válido",
  "auth/network-request-failed": "Sin conexión. Verificá tu internet",
};

type RoleOption = {
  role: Role;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  accent: string;
  features: string[];
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "citizen",
    icon: "people",
    title: "Vecino",
    desc: "Reportá incidencias y enviá alertas de pánico desde tu zona.",
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
    title: "Operador / Serenazgo",
    desc: "Gestioná reportes y monitoreá incidencias de la comunidad.",
    accent: colors.warning,
    features: [
      "Bandeja de alertas en tiempo real",
      "Dashboard con estadísticas",
      "Mapa de incidencias",
      "Cambiar estado de reportes",
    ],
  },
];

type FormFields = {
  displayName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  operatorCode: string;
};

type FormErrors = Partial<FormFields> & { general?: string };

export default function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [form, setForm] = useState<FormFields>({
    displayName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    operatorCode: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);

  function setField(key: keyof FormFields, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, general: undefined }));
  }

  function validateStep2(): FormErrors {
    const errs: FormErrors = {};
    if (!form.displayName.trim()) errs.displayName = "El nombre es obligatorio";
    if (!form.email.trim()) errs.email = "El correo es obligatorio";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Correo inválido";
    if (!form.password) errs.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) errs.password = "Mínimo 8 caracteres";
    if (!form.confirmPassword) errs.confirmPassword = "Confirmá la contraseña";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Las contraseñas no coinciden";
    if (selectedRole === "operator") {
      if (!form.operatorCode) errs.operatorCode = "El código de acceso es obligatorio";
      else if (form.operatorCode !== OPERATOR_ACCESS_CODE) errs.operatorCode = "Código de acceso incorrecto";
    }
    return errs;
  }

  async function handleSubmit() {
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const user = await registerWithEmail(form.email.trim(), form.password, form.displayName.trim());
      await setDoc(userDoc(user.uid), {
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: selectedRole!,
        zone: null,
        expoPushTokens: [],
        consentLocation: false,
        consentBiometric: false,
        onboardingDone: false,
        createdAt: serverTimestamp(),
      } as never);
      // _layout.tsx detecta usuario no-anónimo sin onboardingDone → redirige a /onboarding
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setErrors({ general: FIREBASE_ERRORS[code] ?? "Error al crear la cuenta. Intentá de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  }

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} disabled={loading}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear cuenta</Text>
        <Text style={styles.stepIndicator}>{step}/2</Text>
      </View>

      {step === 1 ? (
        <>
          <Text style={styles.stepTitle}>¿Cuál es tu rol?</Text>
          <Text style={styles.stepDesc}>Elegí cómo vas a usar Willay.</Text>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.cards}
            showsVerticalScrollIndicator={false}
          >
            {ROLE_OPTIONS.map((opt) => {
              const active = selectedRole === opt.role;
              return (
                <Pressable
                  key={opt.role}
                  onPress={() => setSelectedRole(opt.role)}
                  style={[
                    styles.card,
                    active && { borderColor: opt.accent, backgroundColor: colors.surfaceAlt },
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
                        <Text style={[styles.featureText, active && { color: colors.text }]}>
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
            <PrimaryButton
              title="Siguiente"
              onPress={() => setStep(2)}
              disabled={!selectedRole}
            />
          </View>
        </>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepTitle}>Tus datos</Text>
          <Text style={styles.stepDesc}>
            {selectedRole === "operator" ? "Registro como Operador / Serenazgo" : "Registro como Vecino"}
          </Text>

          {/* Nombre */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nombre completo *</Text>
            <View style={[styles.inputWrap, !!errors.displayName && styles.inputError]}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor={colors.textMuted}
                value={form.displayName}
                onChangeText={(t) => setField("displayName", t)}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
            {!!errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
          </View>

          {/* Correo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Correo electrónico *</Text>
            <View style={[styles.inputWrap, !!errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textMuted}
                value={form.email}
                onChangeText={(t) => setField("email", t)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Teléfono */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Teléfono <Text style={styles.optional}>(opcional)</Text></Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej: 987654321"
                placeholderTextColor={colors.textMuted}
                value={form.phone}
                onChangeText={(t) => setField("phone", t)}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>
          </View>

          {/* Contraseña */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Contraseña * <Text style={styles.optional}>(mín. 8 caracteres)</Text></Text>
            <View style={[styles.inputWrap, !!errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Contraseña"
                placeholderTextColor={colors.textMuted}
                value={form.password}
                onChangeText={(t) => setField("password", t)}
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
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirmar contraseña */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Confirmar contraseña *</Text>
            <View style={[styles.inputWrap, !!errors.confirmPassword && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Repetí la contraseña"
                placeholderTextColor={colors.textMuted}
                value={form.confirmPassword}
                onChangeText={(t) => setField("confirmPassword", t)}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Código de operador (solo si rol = operator) */}
          {selectedRole === "operator" && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Código de acceso de operador *</Text>
              <View style={[styles.inputWrap, !!errors.operatorCode && styles.inputError]}>
                <Ionicons name="key-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Código proporcionado por el admin"
                  placeholderTextColor={colors.textMuted}
                  value={form.operatorCode}
                  onChangeText={(t) => setField("operatorCode", t)}
                  secureTextEntry={!showCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowCode((v) => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showCode ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {!!errors.operatorCode && <Text style={styles.errorText}>{errors.operatorCode}</Text>}
            </View>
          )}

          {!!errors.general && (
            <View style={styles.generalError}>
              <Ionicons name="alert-circle" size={16} color="#ff5c5c" />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          >
            {loading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>Creando cuenta…</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>Crear cuenta</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },
  stepIndicator: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  stepTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  stepDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  // Step 1 — cards
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
  // Step 2 — form
  formContent: { gap: 4, paddingBottom: 24 },
  fieldGroup: { gap: 4, marginBottom: 6 },
  fieldLabel: { color: colors.text, fontWeight: "600", fontSize: 13 },
  optional: { color: colors.textMuted, fontWeight: "400" },
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
  inputError: { borderColor: "#ff5c5c" },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  eyeBtn: { padding: 4 },
  errorText: { color: "#ff5c5c", fontSize: 12, marginTop: 2 },
  generalError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ff5c5c18",
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  generalErrorText: { color: "#ff5c5c", fontSize: 13, flex: 1 },
  submitBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
