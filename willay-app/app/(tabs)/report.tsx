import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { reportsCol } from "@/lib/collections";
import { getCurrentWithGeohash } from "@/lib/location";
import { uploadReportPhoto } from "@/lib/storage";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { IncidentType } from "@/types/models";

const MAX = 280;

const INCIDENT_TYPES: {
  id: IncidentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { id: "robo", label: "Robo", icon: "bag-remove", color: "#FF5C5C" },
  { id: "asalto", label: "Asalto", icon: "alert-circle", color: "#FF8A3D" },
  { id: "violencia_familiar", label: "Violencia familiar", icon: "people", color: "#E0457B" },
  { id: "accidente", label: "Accidente", icon: "car-sport", color: "#F5A524" },
  { id: "persona_sospechosa", label: "Persona sospechosa", icon: "eye", color: "#8B5CF6" },
  { id: "vandalismo", label: "Vandalismo", icon: "hammer", color: "#3DA5D9" },
  { id: "otro", label: "Otro", icon: "ellipsis-horizontal-circle", color: "#A1A8B8" },
];

export default function ReportText() {
  const { user } = useAuthUser();
  const router = useRouter();
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // ── Tomar foto con la cámara ──
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso necesario", "Activa el permiso de cámara para tomar una foto.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
    }
  }

  // ── Elegir foto de la galería ──
  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
    }
  }

  // ── Preguntar cámara o galería ──
  function choosePhotoSource() {
    Alert.alert("Adjuntar foto", "¿De dónde quieres tomar la foto?", [
      { text: "Cámara", onPress: takePhoto },
      { text: "Galería", onPress: pickPhoto },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

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
    if (trimmed.length > MAX) {
      Alert.alert("Reporte muy largo", `Máximo ${MAX} caracteres.`);
      return;
    }

    setSending(true);
    try {
      const loc = await getCurrentWithGeohash();

      // Generamos primero la referencia (y su ID) para el nuevo reporte.
      const ref = doc(reportsCol());

      // Si hay foto, la subimos ANTES de crear el documento, usando el ID.
      // Así la URL se incluye en el create (el vecino no puede hacer update).
      let photoUrl: string | undefined;
      if (photoUri) {
        try {
          photoUrl = await uploadReportPhoto(ref.id, photoUri);
        } catch (photoErr) {
          console.warn("[report] error subiendo foto", photoErr);
          Alert.alert(
            "Foto no subida",
            "No se pudo subir la foto. El reporte se enviará sin imagen.",
          );
        }
      }

      // Creamos el documento con todos los datos (incluida la foto si existe).
      await setDoc(ref, {
        authorUid: user.uid,
        type: "text",
        incidentType,
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

  return (
    <Screen scroll>
      <Text style={styles.h1}>Reportar incidente</Text>
      <Text style={styles.muted}>
        Selecciona el tipo, describe qué pasó y envía. Tu ubicación se adjunta
        automáticamente.
      </Text>

      {/* ── Tipo de incidente ── */}
      <Text style={styles.sectionLabel}>Tipo de incidente</Text>
      <View style={styles.typeGrid}>
        {INCIDENT_TYPES.map((t) => {
          const active = incidentType === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setIncidentType(t.id)}
              style={[
                styles.typeCard,
                active && { borderColor: t.color, backgroundColor: colors.surfaceAlt },
              ]}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: t.color + "22" }]}>
                <Ionicons name={t.icon} size={22} color={t.color} />
              </View>
              <Text
                style={[styles.typeLabel, active && { color: t.color, fontWeight: "800" }]}
                numberOfLines={2}
              >
                {t.label}
              </Text>
              {active && (
                <View style={[styles.typeCheck, { backgroundColor: t.color }]}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Descripción ── */}
      <Text style={styles.sectionLabel}>Descripción</Text>
      <View style={styles.box}>
        <TextInput
          style={styles.input}
          placeholder="Ej.: dos sujetos con cuchillo cerca del parque…"
          placeholderTextColor={colors.textMuted}
          multiline
          value={text}
          onChangeText={(t) => setText(t.slice(0, MAX))}
          maxLength={MAX}
        />
        <Text
          style={[styles.counter, text.length > MAX * 0.9 && { color: colors.warning }]}
        >
          {text.length} / {MAX}
        </Text>
      </View>

      {/* ── Foto opcional ── */}
      <Text style={styles.sectionLabel}>Foto (opcional)</Text>
      {photoUri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          <Pressable style={styles.photoRemove} onPress={() => setPhotoUri(null)}>
            <Ionicons name="close-circle" size={26} color="#fff" />
          </Pressable>
          <Pressable style={styles.photoChange} onPress={choosePhotoSource}>
            <Ionicons name="camera-reverse" size={16} color={colors.text} />
            <Text style={styles.photoChangeText}>Cambiar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.photoBtn} onPress={choosePhotoSource}>
          <Ionicons name="camera" size={22} color={colors.brand} />
          <Text style={styles.photoBtnText}>Adjuntar foto</Text>
        </Pressable>
      )}

      <View style={{ height: 8 }} />

      <PrimaryButton
        title={sending ? "Enviando…" : "Enviar reporte"}
        onPress={submit}
        loading={sending}
        disabled={!incidentType || !text.trim()}
      />

      <View style={{ height: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 22, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  sectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },

  // Grid de tipos
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: {
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 15,
  },
  typeCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  // Caja de texto
  box: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: "top",
    lineHeight: 21,
  },
  counter: { color: colors.textMuted, fontSize: 11, textAlign: "right" },

  // Botón de foto
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 16,
    borderStyle: "dashed",
  },
  photoBtnText: { color: colors.brand, fontSize: 15, fontWeight: "700" },

  // Preview de foto
  photoPreviewWrap: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
  },
  photoChange: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  photoChangeText: { color: colors.text, fontSize: 12, fontWeight: "600" },
});