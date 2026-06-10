// ════════════════════════════════════════════════════════════════════
// Crear ficha de persona desaparecida/buscada — diseño profesional
// ════════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  Alert, Image, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { missingPersonsCol } from "@/lib/collections";
import { getFaceEmbedder } from "@/lib/face";
import { getCurrentWithGeohash } from "@/lib/location";
import { uploadMissingPhoto } from "@/lib/storage";
import { useAuthUser } from "@/lib/session";
import { ZONES } from "@/lib/zones";
import { colors } from "@/theme/colors";
import type { PersonCategory, Zone } from "@/types/models";

export default function NewMissing() {
  const { user } = useAuthUser();
  const router = useRouter();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<PersonCategory>("perdida");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState<Zone>("centro");
  const [saving, setSaving] = useState(false);

  const isBuscada = category === "buscada";
  const valid = !!photoUri && name.trim().length > 0 && Number(age) > 0;

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  async function shootPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permiso requerido", "Activa la cámara."); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  function choosePhoto() {
    Alert.alert("Foto de la persona", "¿De dónde?", [
      { text: "Cámara", onPress: shootPhoto },
      { text: "Galería", onPress: pickPhoto },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function submit() {
    if (!user || !photoUri) return;
    setSaving(true);
    try {
      const tempRef = await addDoc(missingPersonsCol(), {
        registrantUid: user.uid,
        name: name.trim(),
        age: Number(age),
        description: description.trim(),
        category,
        lastSeenZone: zone,
        lastSeenGeohash: "",
        photoUrl: "",
        embedding: null,
        active: true,
        createdAt: serverTimestamp(),
        closedAt: null,
      } as never);

      const [embedding, loc] = await Promise.all([
        getFaceEmbedder().embed(photoUri).catch((e) => { console.warn("[new] embedding falló:", e); return null; }),
        getCurrentWithGeohash().catch(() => null),
      ]);

      const photoUrl = await uploadMissingPhoto(tempRef.id, photoUri);

      await setDoc(doc(missingPersonsCol(), tempRef.id), {
        registrantUid: user.uid,
        name: name.trim(),
        age: Number(age),
        description: description.trim(),
        category,
        lastSeenZone: zone,
        lastSeenGeohash: loc?.geohash ?? "",
        ...(loc && { lastSeenLocation: loc.geopoint }),
        photoUrl,
        embedding,
        active: true,
        createdAt: serverTimestamp(),
        closedAt: null,
      } as never, { merge: true });

      router.replace({ pathname: "/missing/[id]", params: { id: tempRef.id } });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isBuscada ? colors.danger : colors.brand }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Nueva Ficha</Text>
          <Text style={styles.headerTitle}>{isBuscada ? "Persona Buscada" : "Persona Desaparecida"}</Text>
        </View>
        <Ionicons name={isBuscada ? "alert-circle" : "help-buoy"} size={30} color="white" style={{ opacity: 0.85 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Selector de categoría */}
        <Text style={styles.sectionLabel}>Tipo de ficha</Text>
        <View style={styles.catRow}>
          <TouchableOpacity
            onPress={() => setCategory("perdida")}
            style={[styles.catCard, category === "perdida" && { borderColor: colors.brand, backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name="help-buoy" size={28} color={category === "perdida" ? colors.brand : colors.textMuted} />
            <Text style={[styles.catTitle, category === "perdida" && { color: colors.brand }]}>Persona perdida</Text>
            <Text style={styles.catDesc}>Desaparecida, se busca encontrarla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCategory("buscada")}
            style={[styles.catCard, category === "buscada" && { borderColor: colors.danger, backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name="alert-circle" size={28} color={category === "buscada" ? colors.danger : colors.textMuted} />
            <Text style={[styles.catTitle, category === "buscada" && { color: colors.danger }]}>Persona buscada</Text>
            <Text style={styles.catDesc}>Sospechoso o delincuente identificado</Text>
          </TouchableOpacity>
        </View>

        {/* Foto */}
        <Text style={styles.sectionLabel}>Foto de la persona *</Text>
        <TouchableOpacity style={styles.photoBox} onPress={choosePhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={36} color={colors.textMuted} />
              <Text style={styles.photoPlaceholderTxt}>Toca para agregar foto</Text>
            </View>
          )}
          {photoUri && (
            <View style={styles.photoOverlay}>
              <Ionicons name="camera-reverse" size={20} color="white" />
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>Cambiar</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Datos */}
        <Text style={styles.sectionLabel}>Nombre completo *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Ej. María García López"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Edad *</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Ej. 34"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sectionLabel}>{isBuscada ? "Descripción / motivo de búsqueda" : "Descripción"}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
          multiline
          placeholder={isBuscada ? "Delito cometido, señas particulares..." : "Ropa que llevaba, contexto..."}
          placeholderTextColor={colors.textMuted}
        />

        {/* Zona */}
        <Text style={styles.sectionLabel}>Zona donde fue vista por última vez</Text>
        <View style={styles.chips}>
          {ZONES.map((z) => (
            <TouchableOpacity
              key={z.value}
              onPress={() => setZone(z.value)}
              style={[styles.chip, zone === z.value && { backgroundColor: isBuscada ? colors.danger : colors.brand, borderColor: isBuscada ? colors.danger : colors.brand }]}
            >
              <Text style={[styles.chipTxt, zone === z.value && { color: "white", fontWeight: "700" }]}>{z.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nota */}
        <View style={styles.note}>
          <Ionicons name="information-circle" size={16} color={colors.warning} />
          <Text style={styles.noteTxt}>
            La foto se usará para búsqueda facial automática. Asegúrate que se vea el rostro claramente.
          </Text>
        </View>

        <View style={{ height: 16 }} />

        {/* Botón */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isBuscada ? colors.danger : colors.brand },
            !valid && { opacity: 0.4 },
          ]}
          onPress={submit}
          disabled={!valid || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitTxt}>
              {isBuscada ? "PUBLICAR FICHA DE BÚSQUEDA" : "PUBLICAR FICHA"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "900" },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 8,
  },

  catRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  catCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  catTitle: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  catDesc: { color: colors.textMuted, fontSize: 11, textAlign: "center", lineHeight: 14 },

  photoBox: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    position: "relative",
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 10,
  },
  photoPlaceholderTxt: { color: colors.textMuted, fontSize: 14 },
  photoOverlay: {
    position: "absolute", bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },

  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    marginBottom: 4,
  },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipTxt: { color: colors.text, fontSize: 13 },

  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.warning + "18",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.warning + "44",
    marginTop: 8,
  },
  noteTxt: { color: colors.warning, fontSize: 12, lineHeight: 18, flex: 1 },

  submitBtn: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  submitTxt: { color: "white", fontSize: 16, fontWeight: "900", letterSpacing: 1.2 },
});