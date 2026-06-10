// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/(auth)/onboarding.tsx
// Selección de zona + consentimientos — diseño profesional
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Switch, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { userDoc } from "@/lib/collections";
import { ZONES } from "@/lib/zones";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { Zone } from "@/types/models";

export default function Onboarding() {
  const { user } = useAuthUser();
  const [zone,             setZone]             = useState<Zone | null>(null);
  const [consentLocation,  setConsentLocation]  = useState(false);
  const [consentBiometric, setConsentBiometric] = useState(false);
  const [saving,           setSaving]           = useState(false);

  const isAnonymous = user?.isAnonymous ?? false;
  const canSubmit   = isAnonymous ? true : !!zone && consentLocation;

  async function submit() {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        userDoc(user.uid),
        {
          zone: zone ?? "otros",
          consentLocation,
          consentBiometric,
          onboardingDone: true,
          updatedAt: serverTimestamp(),
        } as never,
        { merge: true },
      );
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function skipAsGuest() {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        userDoc(user.uid),
        { zone: "otros", consentLocation: false, consentBiometric: false, onboardingDone: true, updatedAt: serverTimestamp() } as never,
        { merge: true },
      );
    } catch {
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={28} color="white" />
          </View>
          <Text style={styles.brand}>Willay</Text>
        </View>

        <Text style={styles.title}>¿En qué zona vives?</Text>
        <Text style={styles.subtitle}>
          Esto nos ayuda a enviarte alertas relevantes cerca de ti.
        </Text>

        {/* Zonas */}
        <View style={styles.zonesGrid}>
          {ZONES.map((z) => {
            const active = zone === z.value;
            return (
              <TouchableOpacity
                key={z.value}
                onPress={() => setZone(z.value)}
                style={[styles.zoneCard, active && styles.zoneCardActive]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={active ? "white" : colors.textMuted}
                />
                <Text style={[styles.zoneTxt, active && styles.zoneTxtActive]}>
                  {z.label}
                </Text>
                {active && (
                  <View style={styles.zoneCheck}>
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Consentimientos */}
        <Text style={styles.sectionLabel}>PERMISOS</Text>

        <View style={styles.consentCard}>
          <View style={styles.consentRow}>
            <View style={[styles.consentIcon, { backgroundColor: colors.brand + "22" }]}>
              <Ionicons name="location" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentTitle}>Uso de ubicación</Text>
              <Text style={styles.consentDesc}>
                Necesaria para enviar reportes y recibir alertas cercanas.
              </Text>
            </View>
            <Switch
              value={consentLocation}
              onValueChange={setConsentLocation}
              trackColor={{ true: colors.brand, false: colors.border }}
              thumbColor="white"
            />
          </View>

          <View style={styles.consentDivider} />

          <View style={styles.consentRow}>
            <View style={[styles.consentIcon, { backgroundColor: colors.warning + "22" }]}>
              <Ionicons name="scan" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentTitle}>Procesamiento facial</Text>
              <Text style={styles.consentDesc}>
                Para búsqueda de personas desaparecidas. Opcional.
              </Text>
            </View>
            <Switch
              value={consentBiometric}
              onValueChange={setConsentBiometric}
              trackColor={{ true: colors.warning, false: colors.border }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Nota legal */}
        <View style={styles.legalNote}>
          <Ionicons name="information-circle" size={15} color={colors.textMuted} />
          <Text style={styles.legalTxt}>
            Tus datos se usan solo para la seguridad de tu comunidad. Puedes cambiar estos permisos en Perfil.
          </Text>
        </View>

        <View style={{ height: 16 }} />

        {/* Botón continuar */}
        <TouchableOpacity
          style={[styles.continueBtn, !canSubmit && { opacity: 0.4 }]}
          onPress={submit}
          disabled={!canSubmit || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.continueTxt}>Continuar</Text>
          )}
        </TouchableOpacity>

        {isAnonymous && (
          <TouchableOpacity style={styles.skipBtn} onPress={skipAsGuest} disabled={saving}>
            <Text style={styles.skipTxt}>Saltar → Entrar como invitado</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 56 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  logoCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  brand: { color: colors.text, fontSize: 24, fontWeight: "900" },

  title: { color: colors.text, fontSize: 26, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },

  // Zonas
  zonesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  zoneCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  zoneCardActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  zoneTxt: { color: colors.textMuted, fontSize: 14, fontWeight: "600", flex: 1 },
  zoneTxtActive: { color: "white" },
  zoneCheck: {
    position: "absolute", top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Consentimientos
  consentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  consentIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  consentTitle: { color: colors.text, fontWeight: "700", fontSize: 14, marginBottom: 2 },
  consentDesc: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  consentDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  legalNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  legalTxt: { color: colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },

  continueBtn: {
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
  continueTxt: { color: "white", fontSize: 16, fontWeight: "800" },

  skipBtn: { alignItems: "center", paddingVertical: 14 },
  skipTxt: { color: colors.textMuted, fontSize: 14 },
});