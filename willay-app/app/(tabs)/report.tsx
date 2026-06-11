// ════════════════════════════════════════════════════════════════════
// UBICACIÓN:  willay-app/app/(tabs)/report.tsx
// Pantalla de reporte — se abre desde las categorías del home
// Header con tipo preseleccionado, descripción + foto, botón REGISTRAR
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { Screen } from "@/components/ui/Screen";
import { reportsCol } from "@/lib/collections";
import { getCurrentWithGeohash } from "@/lib/location";
import { uploadReportPhoto } from "@/lib/storage";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { IncidentType } from "@/types/models";

const MAX = 280;

const INCIDENT_TYPES: {
  id: IncidentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "robo",               label: "Robo",       icon: "card"         },
  { id: "asalto",             label: "Extorsión",  icon: "phone-portrait"},
  { id: "violencia_familiar", label: "Violencia",  icon: "hand-left"    },
  { id: "accidente",          label: "Salud",      icon: "medkit"       },
  { id: "persona_sospechosa", label: "Rescate",    icon: "shield"       },
  { id: "vandalismo",         label: "Incendio",   icon: "flame"        },
  { id: "otro",               label: "Otros",      icon: "grid"         },
];

function getIncident(id?: string) {
  return INCIDENT_TYPES.find((t) => t.id === id) ?? null;
}

export default function ReportScreen() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const router = useRouter();
  const params = useLocalSearchParams<{ incidentType?: string; categoryLabel?: string }>();

  const initial = getIncident(params.incidentType);
  const categoryLabel = params.categoryLabel; // label original de la categoría tocada
  const [incidentType, setIncidentType] = useState<IncidentType | null>(initial?.id ?? null);
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showTypes, setShowTypes] = useState(!initial);

  const selected = getIncident(incidentType ?? undefined);
  // Usar el label original de la categoría si viene del home
  const displayLabel = categoryLabel ?? selected?.label ?? null;

  // ── Foto ──────────────────────────────────────────────────────────
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso necesario", "Activa el permiso de cámara.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [4, 3] });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, aspect: [4, 3] });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  function choosePhoto() {
    Alert.alert("Adjuntar foto", "¿De dónde?", [
      { text: "Cámara", onPress: takePhoto },
      { text: "Galería", onPress: pickPhoto },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  // ── Enviar ────────────────────────────────────────────────────────
  async function submit() {
    if (!user) return;
    if (!incidentType) {
      Alert.alert("Falta el tipo", "Selecciona el tipo de incidente.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert("Falta la descripción", "Describe brevemente qué pasó.");
      return;
    }

    setSending(true);
    try {
      const loc = await getCurrentWithGeohash();
      const ref = doc(reportsCol());

      let photoUrl: string | undefined;
      if (photoUri) {
        try {
          photoUrl = await uploadReportPhoto(ref.id, photoUri);
        } catch {
          Alert.alert("Foto no subida", "El reporte se enviará sin imagen.");
        }
      }

      await setDoc(ref, {
        authorUid: user.uid,
        authorName: profile?.displayName ?? "Vecino anónimo",
        type: "text",
        incidentType,
        categoryLabel: displayLabel ?? incidentType,
        text: trimmed,
        ...(photoUrl ? { photoUrl } : {}),
        location: loc.geopoint,
        geohash: loc.geohash,
        status: "received",
        attendedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as never);

      setText("");
      setIncidentType(null);
      setPhotoUri(null);
      router.push({ pathname: "/report/[id]", params: { id: ref.id } });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const canSubmit = !!incidentType && text.trim().length > 0 && !sending;

  return (
    <Screen padded={false}>
      {/* ── Header con tipo seleccionado ── */}
      <View style={[styles.header, { backgroundColor: selected?.color ?? colors.brand }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Nuevo Reporte</Text>
          <Text style={styles.headerTitle}>
            {displayLabel ? `Alerta de ${displayLabel}` : "Selecciona un tipo"}
          </Text>
        </View>
        {selected && (
          <Ionicons name={selected.icon} size={32} color="white" style={{ opacity: 0.85 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Cambiar tipo (toggle) ── */}
        <TouchableOpacity style={styles.changeTypeBtn} onPress={() => setShowTypes((v) => !v)}>
          <Ionicons name="swap-horizontal" size={16} color={colors.brand} />
          <Text style={styles.changeTypeTxt}>
            {showTypes ? "Ocultar tipos" : "Cambiar tipo de incidente"}
          </Text>
          <Ionicons name={showTypes ? "chevron-up" : "chevron-down"} size={16} color={colors.brand} />
        </TouchableOpacity>

        {/* ── Grid de tipos (colapsable) — mismo estilo que el home ── */}
        {showTypes && (
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map((t) => {
              const active = incidentType === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => { setIncidentType(t.id); setShowTypes(false); }}
                  style={({ pressed }) => [
                    styles.typeCard,
                    active && styles.typeCardActive,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                  ]}
                >
                  <Ionicons name={t.icon} size={34} color="white" />
                  <Text style={styles.typeLabel}>{t.label}</Text>
                  {active && (
                    <View style={styles.typeCheck}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Descripción ── */}
        <Text style={styles.sectionLabel}>Descripción</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tus comentarios..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX))}
            maxLength={MAX}
          />
          <Text style={[styles.counter, text.length > MAX * 0.85 && { color: colors.warning }]}>
            {text.length} / {MAX}
          </Text>
        </View>

        {/* ── Foto ── */}
        <Text style={styles.sectionLabel}>Imágenes adjuntas</Text>
        {photoUri ? (
          <View style={styles.photoPreviewWrap}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotoUri(null)}>
              <Ionicons name="close-circle" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoChange} onPress={choosePhoto}>
              <Ionicons name="camera-reverse" size={14} color={colors.text} />
              <Text style={styles.photoChangeTxt}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
              <View style={[styles.mediaIcon, { backgroundColor: colors.brand }]}>
                <Ionicons name="camera" size={26} color="white" />
              </View>
              <Text style={styles.mediaTxt}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickPhoto}>
              <View style={[styles.mediaIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="image" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.mediaTxt}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={() =>
              Alert.alert("Próximamente", "La grabación de audio estará disponible pronto.")
            }>
              <View style={[styles.mediaIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="mic" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.mediaTxt}>Audio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Info ubicación ── */}
        <View style={styles.locationNote}>
          <Ionicons name="location" size={16} color={colors.success} />
          <Text style={styles.locationTxt}>Tu ubicación se adjunta automáticamente</Text>
        </View>

        <View style={{ height: 16 }} />

        {/* ── Botón REGISTRAR ── */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && { opacity: 0.45 }]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.submitTxt}>{sending ? "ENVIANDO…" : "REGISTRAR"}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Header dinámico
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "900" },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  // Cambiar tipo
  changeTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.brand + "18",
    borderWidth: 1,
    borderColor: colors.brand + "44",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  changeTypeTxt: { color: colors.brand, fontSize: 13, fontWeight: "700" },

  // Grid tipos — mismo estilo que el home
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  typeCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "#1A3A6B",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
    position: "relative",
  },
  typeCardActive: {
    backgroundColor: "#1A3A6B",
    borderWidth: 2,
    borderColor: "white",
  },
  typeLabel: { color: "white", fontSize: 13, fontWeight: "700", textAlign: "center" },
  typeCheck: {
    position: "absolute", top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  typeIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  // Sección label
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  // Input descripción
  inputBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 20,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    minHeight: 130,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  counter: { color: colors.textMuted, fontSize: 12, textAlign: "right", marginTop: 8 },

  // Media row
  mediaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    paddingVertical: 12,
    marginBottom: 16,
  },
  mediaBtn: { alignItems: "center", gap: 8 },
  mediaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaTxt: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },

  // Preview foto
  photoPreviewWrap: { borderRadius: 14, overflow: "hidden", position: "relative", marginBottom: 16 },
  photoPreview: { width: "100%", height: 200, backgroundColor: colors.surfaceAlt },
  photoRemove: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 999 },
  photoChange: {
    position: "absolute", bottom: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  photoChangeTxt: { color: colors.text, fontSize: 12, fontWeight: "600" },

  // Nota ubicación
  locationNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.success + "18",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.success + "44",
  },
  locationTxt: { color: colors.success, fontSize: 13, fontWeight: "600", flex: 1 },

  // Botón REGISTRAR
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  submitTxt: { color: "white", fontSize: 18, fontWeight: "900", letterSpacing: 1.5 },
});