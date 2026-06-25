// ════════════════════════════════════════════════════════════════════
// Detalle de ficha — vista para vecino Y operador
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { missingPersonDoc } from "@/lib/collections";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { zoneLabel } from "@/lib/zones";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc } from "@/types/models";

export default function MissingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const router = useRouter();

  const [data, setData] = useState<MissingPersonDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(missingPersonDoc(id), (snap) => {
      setData(snap.exists() ? (snap.data() as MissingPersonDoc) : null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
          Ficha no encontrada.
        </Text>
      </Screen>
    );
  }

  const isOwner = user?.uid === data.registrantUid;
  const isOperator = profile?.role === "operator";
  const isBuscada = data.category === "buscada";
  const accentColor = isBuscada ? colors.danger : colors.brand;

  async function closeCase() {
    if (!id) return;
    Alert.alert(
      isBuscada ? "Cerrar búsqueda" : "Marcar como encontrada",
      isBuscada ? "¿Confirmas cerrar esta ficha?" : "¿La persona fue encontrada?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            setClosing(true);
            try {
              await updateDoc(missingPersonDoc(id), {
                active: false,
                embedding: null,
                closedAt: serverTimestamp(),
              } as never);
              router.back();
            } catch (e) {
              Alert.alert("Error", (e as Error).message);
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Foto grande + header superpuesto */}
        <View style={styles.photoWrap}>
          {data.photoUrl ? (
            <Image source={{ uri: data.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={64} color={colors.textMuted} />
            </View>
          )}

          {/* Overlay degradado + botón back */}
          <View style={styles.photoOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>

          {/* Badge de estado */}
          <View style={[styles.statusBadge, { backgroundColor: data.active ? accentColor : colors.textMuted }]}>
            <Ionicons name={data.active ? (isBuscada ? "alert-circle" : "help-buoy") : "checkmark-circle"} size={13} color="white" />
            <Text style={styles.statusTxt}>
              {data.active ? (isBuscada ? "BUSCADA" : "DESAPARECIDA") : "CERRADA"}
            </Text>
          </View>
        </View>

        <View style={styles.content}>

          {/* Nombre y edad */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{data.name}</Text>
            <Text style={styles.age}>{data.age} años</Text>
          </View>

          {/* Datos rápidos */}
          <View style={styles.quickRow}>
            <QuickInfo icon="location" label="Zona" value={zoneLabel(data.lastSeenZone)} />
            <QuickInfo icon="calendar" label="Registrada" value={
              data.createdAt
                ? new Date((data.createdAt as any).seconds * 1000).toLocaleDateString("es-PE")
                : "—"
            } />
            <QuickInfo
              icon={isBuscada ? "alert-circle" : "help-buoy"}
              label="Tipo"
              value={isBuscada ? "Buscada" : "Perdida"}
              valueColor={accentColor}
            />
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {isBuscada ? "DESCRIPCIÓN / MOTIVO" : "DESCRIPCIÓN"}
            </Text>
            <Text style={styles.description}>{data.description || "Sin descripción registrada."}</Text>
          </View>

          {/* Aviso de búsqueda facial */}
          {data.active && data.embedding && (
            <View style={styles.faceNote}>
              <Ionicons name="scan" size={18} color={colors.success} />
              <Text style={styles.faceNoteTxt}>
                Búsqueda facial activa — se notificará si hay un avistamiento
              </Text>
            </View>
          )}

          {/* Acciones del operador */}
          {isOperator && data.active && (
            <View style={styles.operatorSection}>
              <Text style={styles.sectionLabel}>ACCIONES DEL OPERADOR</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: "/missing/scan", params: { missingId: id } })}
              >
                <Ionicons name="camera" size={20} color={colors.brand} />
                <Text style={styles.actionBtnTxt}>Escanear avistamiento facial</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Cerrar ficha (dueño u operador) */}
          {(isOwner || isOperator) && data.active && (
            <>
              <View style={{ height: 8 }} />
              <TouchableOpacity
                style={[styles.closeBtn, closing && { opacity: 0.6 }]}
                onPress={closeCase}
                disabled={closing}
              >
                {closing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.closeBtnTxt}>
                      {isBuscada ? "Cerrar búsqueda" : "Marcar como encontrada"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function QuickInfo({ icon, label, value, valueColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.quickCard}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={[styles.quickValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoWrap: { width: "100%", height: 320, position: "relative" },
  photo: { width: "100%", height: "100%", backgroundColor: colors.surfaceAlt },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  backBtn: {
    position: "absolute", top: 16, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  statusBadge: {
    position: "absolute", bottom: 16, right: 16,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
  },
  statusTxt: { color: "white", fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },

  content: { padding: 20, gap: 16 },

  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  name: { color: colors.text, fontSize: 26, fontWeight: "900", flex: 1 },
  age: { color: colors.textMuted, fontSize: 16, fontWeight: "600" },

  quickRow: { flexDirection: "row", gap: 10 },
  quickCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 12, alignItems: "center", gap: 4,
  },
  quickLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  quickValue: { color: colors.text, fontSize: 13, fontWeight: "700", textAlign: "center" },

  section: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  description: { color: colors.text, fontSize: 15, lineHeight: 22 },

  faceNote: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.success + "18",
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.success + "44",
  },
  faceNoteTxt: { color: colors.success, fontSize: 13, fontWeight: "600", flex: 1 },

  operatorSection: { gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 16,
  },
  actionBtnTxt: { color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 },

  closeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.success,
    borderRadius: 16, paddingVertical: 18,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  closeBtnTxt: { color: "white", fontSize: 16, fontWeight: "900" },
});