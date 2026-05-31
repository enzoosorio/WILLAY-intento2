import { Alert, StyleSheet, Text, View, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
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
  { id: "zapallal", label: "Zapallal" },
  { id: "la_ensenada", label: "La Ensenada" },
  { id: "huamantanga", label: "Huamantanga" },
  { id: "centro", label: "Centro" },
  { id: "otros", label: "Otros" },
];

export default function Profile() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const [modalVisible, setModalVisible] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  const isOperator = profile?.role === "operator";

  async function cambiarZona(nuevaZonaId: string) {
    if (!user?.uid) return;
    setActualizando(true);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", user.uid), { zone: nuevaZonaId });
      setModalVisible(false);
    } catch (error) {
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

  // ════════════════════════════════════════════════════════════════
  // PERFIL DEL ADMINISTRADOR (policía / serenazgo / torre de control)
  // ════════════════════════════════════════════════════════════════
  if (isOperator) {
    return (
      <Screen scroll>
        {/* Tarjeta de credencial */}
        <View style={styles.credential}>
          <View style={styles.credentialBadge}>
            <Ionicons name="shield-checkmark" size={40} color={colors.warning} />
          </View>
          <Text style={styles.credentialName}>
            {profile?.displayName ?? "Administrador"}
          </Text>
          <View style={styles.roleTag}>
            <Ionicons name="ribbon" size={13} color={colors.warning} />
            <Text style={styles.roleTagText}>Central de Monitoreo</Text>
          </View>
        </View>

        {/* Información de la cuenta */}
        <Text style={styles.sectionLabel}>Información de la cuenta</Text>
        <View style={styles.card}>
          <Row icon="person" label="Operador" value={profile?.displayName ?? "—"} />
          <Divider />
          <Row icon="shield" label="Nivel de acceso" value="Administrador" />
          <Divider />
          <Row
            icon="checkmark-circle"
            label="Estado"
            value="Activo"
            valueColor={colors.success}
          />
        </View>

        {/* Funciones */}
        <Text style={styles.sectionLabel}>Permisos del rol</Text>
        <View style={styles.card}>
          <Permission icon="notifications" label="Gestionar alertas ciudadanas" />
          <Divider />
          <Permission icon="map" label="Monitoreo en mapa (radar)" />
          <Divider />
          <Permission icon="stats-chart" label="Estadísticas e incidencias" />
        </View>

        <View style={{ height: 20 }} />

        <Link href="/privacy" style={styles.link}>
          Política de privacidad
        </Link>

        <PrimaryButton title="Cerrar sesión" variant="danger" onPress={confirmSignOut} />

        <View style={{ height: 24 }} />
      </Screen>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PERFIL DEL VECINO
  // ════════════════════════════════════════════════════════════════
  return (
    <Screen scroll>
      {/* Tarjeta de credencial */}
      <View style={styles.credential}>
        <View style={[styles.credentialBadge, { borderColor: colors.brand }]}>
          <Ionicons name="person" size={40} color={colors.brand} />
        </View>
        <Text style={styles.credentialName}>{profile?.displayName ?? "Vecino"}</Text>
        <View style={[styles.roleTag, { borderColor: colors.brand }]}>
          <Ionicons name="people" size={13} color={colors.brand} />
          <Text style={[styles.roleTagText, { color: colors.brand }]}>Vecino</Text>
        </View>
      </View>

      {/* Información */}
      <Text style={styles.sectionLabel}>Mi información</Text>
      <View style={styles.card}>
        <Row icon="person" label="Nombre" value={profile?.displayName ?? "—"} />
        <Divider />
        {/* Zona editable */}
        <TouchableOpacity style={styles.rowTouch} onPress={() => setModalVisible(true)}>
          <View style={styles.rowLeft}>
            <Ionicons name="location" size={16} color={colors.textMuted} />
            <Text style={styles.rowL}>Zona</Text>
          </View>
          <View style={styles.rowEditWrap}>
            <Text style={styles.rowVBrand} numberOfLines={1}>
              {zoneLabel(profile?.zone) || "Seleccionar"}
            </Text>
            <Ionicons name="pencil" size={13} color={colors.brand} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />

      <Link href="/privacy" style={styles.link}>
        Política de privacidad
      </Link>

      <PrimaryButton title="Cerrar sesión" variant="danger" onPress={confirmSignOut} />

      <View style={{ height: 24 }} />

      {/* Modal cambiar zona */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar zona</Text>
            {actualizando ? (
              <ActivityIndicator size="large" color={colors.brand} />
            ) : (
              ZONAS_DISPONIBLES.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  style={[
                    styles.zonaOption,
                    profile?.zone === z.id && styles.zonaOptionActive,
                  ]}
                  onPress={() => cambiarZona(z.id)}
                >
                  <Text
                    style={[
                      styles.zonaOptionText,
                      profile?.zone === z.id && { color: colors.brand, fontWeight: "700" },
                    ]}
                  >
                    {z.label}
                  </Text>
                  {profile?.zone === z.id && (
                    <Ionicons name="checkmark" size={16} color={colors.brand} />
                  )}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={16} color={colors.textMuted} />
        <Text style={styles.rowL}>{label}</Text>
      </View>
      <Text style={[styles.rowV, valueColor && { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Permission({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={16} color={colors.warning} />
        <Text style={styles.permissionText}>{label}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  // Credencial
  credential: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  credentialBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  credentialName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleTagText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
  },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  rowL: { color: colors.textMuted, fontSize: 14 },
  rowV: { color: colors.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  permissionText: { color: colors.text, fontSize: 14, flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border },

  rowTouch: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  rowEditWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowVBrand: { color: colors.brand, fontSize: 14, fontWeight: "700" },

  link: { color: colors.brand, textAlign: "center", fontSize: 13, marginBottom: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  zonaOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zonaOptionActive: { borderColor: colors.brand, backgroundColor: colors.surfaceAlt },
  zonaOptionText: { color: colors.text, fontSize: 15 },
  cancelButton: { marginTop: 8, alignItems: "center", paddingVertical: 8 },
  cancelButtonText: { color: colors.textMuted, fontSize: 14 },
});