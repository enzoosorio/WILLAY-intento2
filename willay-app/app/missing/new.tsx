// Crear ficha de persona desaparecida: foto + datos + embedding on-device.
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { missingPersonDoc, missingPersonsCol } from "@/lib/collections";
import { getFaceEmbedder } from "@/lib/face";
import { getCurrentWithGeohash } from "@/lib/location";
import { uploadMissingPhoto } from "@/lib/storage";
import { useAuthUser } from "@/lib/session";
import { ZONES } from "@/lib/zones";
import { colors } from "@/theme/colors";
import type { Zone } from "@/types/models";

export default function NewMissing() {
  const { user } = useAuthUser();
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState<Zone>("centro");
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }
  async function shootPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso requerido", "Activá la cámara para tomar la foto.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  const valid = !!photoUri && name.trim().length > 0 && Number(age) > 0;

  async function submit() {
    if (!user || !photoUri) return;
    setSaving(true);
    try {
      // 1. Crear doc vacío para reservar ID (necesitamos id antes de subir foto).
      const tempRef = await addDoc(missingPersonsCol(), {
        registrantUid: user.uid,
        name: name.trim(),
        age: Number(age),
        description: description.trim(),
        lastSeenZone: zone,
        lastSeenGeohash: "",
        photoUrl: "",
        embedding: null,
        active: true,
        createdAt: serverTimestamp(),
        closedAt: null,
      } as never);

      // 2. Embedding on-device + ubicación.
      const [embedding, loc] = await Promise.all([
        getFaceEmbedder().embed(photoUri),
        getCurrentWithGeohash().catch(() => null),
      ]);

      // 3. Subir foto a Storage.
      const photoUrl = await uploadMissingPhoto(tempRef.id, photoUri);

      // 4. Actualizar doc con embedding + URL + geohash.
      await setDoc(
        doc(missingPersonsCol(), tempRef.id),
        {
          registrantUid: user.uid,
          name: name.trim(),
          age: Number(age),
          description: description.trim(),
          lastSeenZone: zone,
          lastSeenGeohash: loc?.geohash ?? "",
          ...(loc && { lastSeenLocation: loc.geopoint }),
          photoUrl,
          embedding,
          active: true,
          createdAt: serverTimestamp(),
          closedAt: null,
        } as never,
        { merge: true },
      );

      router.replace({ pathname: "/missing/[id]", params: { id: tempRef.id } });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.photoBox}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={48} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={shootPhoto} style={styles.photoBtn}>
            <Ionicons name="camera" size={16} color={colors.text} />
            <Text style={styles.photoBtnText}>Cámara</Text>
          </Pressable>
          <Pressable onPress={pickPhoto} style={styles.photoBtn}>
            <Ionicons name="image" size={16} color={colors.text} />
            <Text style={styles.photoBtnText}>Galería</Text>
          </Pressable>
        </View>
      </View>

      <Field label="Nombre">
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.textMuted} placeholder="Nombre completo" />
      </Field>
      <Field label="Edad">
        <TextInput value={age} onChangeText={setAge} style={styles.input} keyboardType="number-pad" placeholderTextColor={colors.textMuted} placeholder="ej. 23" />
      </Field>
      <Field label="Descripción">
        <TextInput value={description} onChangeText={setDescription} style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]} multiline placeholderTextColor={colors.textMuted} placeholder="Vestimenta, contexto…" />
      </Field>
      <Field label="Zona vista por última vez">
        <View style={styles.chips}>
          {ZONES.map((z) => (
            <Pressable key={z.value} onPress={() => setZone(z.value)} style={[styles.chip, zone === z.value && styles.chipActive]}>
              <Text style={[styles.chipText, zone === z.value && { fontWeight: "700" }]}>{z.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <PrimaryButton title="Publicar ficha" onPress={submit} loading={saving} disabled={!valid} />
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  photoBox: { gap: 10, alignItems: "center" },
  photo: { width: 160, height: 160, borderRadius: 80 },
  photoPlaceholder: { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  photoBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceAlt, borderRadius: 8 },
  photoBtnText: { color: colors.text, fontSize: 13 },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.surface, color: colors.text, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontSize: 13 },
});
