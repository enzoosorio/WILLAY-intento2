import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View, Alert } from "react-native";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { router } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { userDoc } from "@/lib/collections";
import { ZONES } from "@/lib/zones";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { Zone } from "@/types/models";

export default function Onboarding() {
  const { user } = useAuthUser();
  const [zone, setZone] = useState<Zone | null>(null);
  const [consentLocation, setConsentLocation] = useState(false);
  const [consentBiometric, setConsentBiometric] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAnonymous = user?.isAnonymous ?? false;
  // Invitados pueden continuar sin seleccionar zona ni consentimientos
  const canSubmit = isAnonymous ? true : !!zone && consentLocation;

  async function submit() {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        userDoc(user.uid),
        {
          zone: zone ?? "otro",
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
        {
          zone: "otro",
          consentLocation: false,
          consentBiometric: false,
          onboardingDone: true,
          updatedAt: serverTimestamp(),
        } as never,
        { merge: true },
      );
    } catch (e) {
      // Si Firestore falla igual dejamos pasar al invitado
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.h1}>Cuéntanos un poco</Text>
      <Text style={styles.muted}>
        Tu zona y consentimientos. Podés cambiarlos luego desde Perfil.
      </Text>

      <Text style={styles.label}>Zona donde vivís</Text>
      <View style={styles.zones}>
        {ZONES.map((z) => (
          <Pressable
            key={z.value}
            onPress={() => setZone(z.value)}
            style={[styles.zone, zone === z.value && styles.zoneActive]}
          >
            <Text style={[styles.zoneText, zone === z.value && styles.zoneTextActive]}>
              {z.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.consent}>
        <View style={styles.consentRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.consentTitle}>Uso de ubicación</Text>
            <Text style={styles.consentDesc}>
              Necesaria para enviar reportes y recibir alertas cerca tuyo.
            </Text>
          </View>
          <Switch value={consentLocation} onValueChange={setConsentLocation} />
        </View>
        <View style={styles.consentRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.consentTitle}>Procesamiento facial</Text>
            <Text style={styles.consentDesc}>
              Embeddings on-device para fichas de personas desaparecidas. Opcional.
            </Text>
          </View>
          <Switch value={consentBiometric} onValueChange={setConsentBiometric} />
        </View>
      </View>

      <PrimaryButton
        title="Continuar"
        loading={saving}
        disabled={!canSubmit || saving}
        onPress={submit}
      />

      {/* Solo visible para usuarios anónimos/invitados */}
      {isAnonymous && (
        <PrimaryButton
          title="Saltar → Entrar como invitado"
          variant="ghost"
          loading={saving}
          onPress={skipAsGuest}
          style={{ marginTop: 4 }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 13 },
  label: { color: colors.text, fontWeight: "700", marginTop: 8 },
  zones: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zone: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  zoneActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  zoneText: { color: colors.text, fontSize: 13 },
  zoneTextActive: { fontWeight: "700" },
  consent: { gap: 14, marginTop: 12 },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  consentTitle: { color: colors.text, fontWeight: "700", marginBottom: 2 },
  consentDesc: { color: colors.textMuted, fontSize: 12 },
});