// ════════════════════════════════════════════════════════════════════
// UBICACIÓN:  willay-app/app/(tabs)/profile.tsx
// Perfil del vecino — diseño accesible, datos reales del usuario
// ════════════════════════════════════════════════════════════════════
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { signOut } from "@/lib/auth";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { zoneLabel } from "@/lib/zones";
import { colors } from "@/theme/colors";

const ZONAS_DISPONIBLES = [
  { id: "zapallal",     label: "Zapallal" },
  { id: "la_ensenada", label: "La Ensenada" },
  { id: "huamantanga", label: "Huamantanga" },
  { id: "centro",      label: "Centro" },
  { id: "otros",       label: "Otros" },
];

export default function Profile() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const router = useRouter();

  const [zonaModal, setZonaModal]       = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [silentMode,   setSilentMode]   = useState(false);

  const isOperator = profile?.role === "operator";

  async function cambiarZona(nuevaZonaId: string) {
    if (!user?.uid) return;
    setActualizando(true);
    try {
      await updateDoc(doc(getFirestore(), "users", user.uid), { zone: nuevaZonaId });
      setZonaModal(false);
    } catch {
      Alert.alert("Error", "No se pudo actualizar la zona.");
    } finally {
      setActualizando(false);
    }
  }

  function confirmSignOut() {
    Alert.alert("Cerrar sesión", "¿Seguro que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => signOut() },
    ]);
  }

  // ── OPERADOR ──────────────────────────────────────────────────────
  if (isOperator) {
    return (
      <Screen scroll>
        <Text style={styles.pageTitle}>Perfil</Text>

        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { borderColor: colors.warning }]}>
            <Ionicons name="shield-checkmark" size={44} color={colors.warning} />
          </View>
          <Text style={styles.userName}>{profile?.displayName ?? "Operador"}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.warning + "22", borderColor: colors.warning }]}>
            <Text style={[styles.roleBadgeText, { color: colors.warning }]}>OPERADOR</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>MI INFORMACIÓN</Text>
        <View style={styles.infoCard}>
          <InfoRow label="NOMBRE" value={profile?.displayName ?? "—"} />
          <Divider />
          <InfoRow label="ROL" value="Central de Monitoreo" />
          <Divider />
          <InfoRow label="ESTADO" value="Activo" valueColor={colors.success} />
        </View>

        <NavCard label="Política de privacidad" onPress={() => router.push("/privacy")} />
        <View style={{ height: 8 }} />
        <NavCard label="Términos y condiciones" onPress={() => router.push("/privacy")} />

        <View style={{ height: 24 }} />
        <PrimaryButton title="Cerrar sesión" variant="danger" onPress={confirmSignOut} />
        <View style={{ height: 32 }} />
      </Screen>
    );
  }

  // ── VECINO ────────────────────────────────────────────────────────
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Perfil</Text>

        {/* Avatar + nombre + badge */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { borderColor: colors.brand }]}>
            <Ionicons name="person" size={44} color={colors.textMuted} />
          </View>
          <Text style={styles.userName}>{profile?.displayName ?? "Vecino"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>VECINO</Text>
          </View>
        </View>

        {/* Datos */}
        <Text style={styles.sectionLabel}>MI INFORMACIÓN</Text>
        <View style={styles.infoCard}>
          {/* Nombre (solo lectura) */}
          <InfoRow label="NOMBRE" value={profile?.displayName ?? "—"} />
          <Divider />

          {/* Zona editable */}
          <TouchableOpacity style={styles.editRow} onPress={() => setZonaModal(true)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>ZONA</Text>
              <Text style={styles.rowValue}>{zoneLabel(profile?.zone) || "Seleccionar"}</Text>
            </View>
            <View style={styles.editIcon}>
              <Ionicons name="pencil" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
          <Divider />

          {/* Teléfono (solo lectura, desde perfil) */}
          <InfoRow
            label="TELÉFONO"
            value={profile?.phone ? `+51 ${profile.phone}` : "No registrado"}
          />
        </View>

        {/* Configuración */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>CONFIGURACIÓN</Text>
        <View style={styles.infoCard}>
          <ToggleRow
            label="Notificaciones push"
            description="Recibir alertas del Serenazgo"
            icon="notifications"
            value={notifEnabled}
            onToggle={() => setNotifEnabled(v => !v)}
          />
          <Divider />
          <ToggleRow
            label="Modo silencioso"
            description="Sin sonido en las alertas"
            icon="volume-mute"
            value={silentMode}
            onToggle={() => setSilentMode(v => !v)}
          />
        </View>

        {/* Links */}
        <View style={{ height: 16 }} />
        <NavCard label="Política de privacidad" onPress={() => router.push("/privacy")} />
        <View style={{ height: 8 }} />
        <NavCard label="Términos y condiciones" onPress={() => router.push("/privacy")} />

        <View style={{ height: 24 }} />
        <PrimaryButton title="Cerrar sesión" variant="danger" onPress={confirmSignOut} />
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal cambiar zona */}
      <Modal visible={zonaModal} transparent animationType="fade" onRequestClose={() => setZonaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambiar zona</Text>
            {actualizando ? (
              <ActivityIndicator size="large" color={colors.brand} style={{ marginVertical: 24 }} />
            ) : (
              ZONAS_DISPONIBLES.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  style={[styles.zonaOpt, profile?.zone === z.id && styles.zonaOptActive]}
                  onPress={() => cambiarZona(z.id)}
                >
                  <Text style={[styles.zonaOptText, profile?.zone === z.id && { color: colors.brand, fontWeight: "700" }]}>
                    {z.label}
                  </Text>
                  {profile?.zone === z.id && <Ionicons name="checkmark" size={18} color={colors.brand} />}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setZonaModal(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────

function ToggleRow({ label, description, icon, value, onToggle }: {
  label: string; description: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean; onToggle: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: colors.brand + "22" }]}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: colors.brand, false: colors.border }}
        thumbColor="white"
      />
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function NavCard({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navCard} onPress={onPress}>
      <Text style={styles.navCardText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ── Estilos ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  pageTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 24,
  },

  // Avatar
  avatarWrap: { alignItems: "center", gap: 10, marginBottom: 28 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  roleBadge: {
    backgroundColor: colors.brand + "22",
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  roleBadgeText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  // Sección
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  // Card de info
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  infoRow: {
    paddingVertical: 14,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  editIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border },

  // Nav cards
  navCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navCardText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14,
  },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toggleLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
  toggleDesc:  { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 20 },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  zonaOpt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zonaOptActive: { borderColor: colors.brand, backgroundColor: colors.surfaceAlt },
  zonaOptText: { color: colors.text, fontSize: 15 },
  cancelBtn: { marginTop: 4, alignItems: "center", paddingVertical: 10 },
  cancelText: { color: colors.textMuted, fontSize: 14 },
});