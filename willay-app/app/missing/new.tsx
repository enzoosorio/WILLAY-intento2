// Crear ficha: foto + datos + categoría (perdida/buscada) + embedding on-device.
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
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
      // 1. Crear doc para reservar ID.
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

      // 2. Embedding on-device + ubicación.
      // Si el embedding falla (problema de imagen en Expo Go), NO rompemos
      // el guardado: la ficha se guarda igual con embedding null.
      const [embedding, loc] = await Promise.all([
        getFaceEmbedder()
          .embed(photoUri)
          .catch((e) => {
            console.warn("[new] embedding falló, guardo sin él:", (e as Error).message);
            return null;
          }),
        getCurrentWithGeohash().catch(() => null),
      ]);

      // 3. Subir foto.
      const photoUrl = await uploadMissingPhoto(tempRef.id, photoUri);

      // 4. Actualizar doc completo.
      await setDoc(
        doc(missingPersonsCol(), tempRef.id),
        {
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

  const isBuscada = category === "buscada";

  return (
    <Screen scroll>
      {/* Selector de categoría */}
      <Text style={styles.label}>Tipo de ficha</Text>
      <View style={styles.catRow}>
        <Pressable
          onPress={() => setCategory("perdida")}
          style={[
            styles.catCard,
            category === "perdida" && { borderColor: colors.brand, backgroundColor: colors.surfaceAlt },
          ]}
        >
          <Ionicons
            name="help-buoy"
            size={26}
            color={category === "perdida" ? colors.brand : colors.textMuted}
          />
          <Text
            style={[styles.catTitle, category === "perdida" && { color: colors.brand }]}
          >
            Persona perdida
          </Text>
          <Text style={styles.catDesc}>Desaparecida, se busca encontrarla</Text>
        </Pressable>

        <Pressable
          onPress={() => setCategory("buscada")}
          style={[
            styles.catCard,
            category === "buscada" && { borderColor: colors.p1, backgroundColor: colors.surfaceAlt },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={26}
            color={category === "buscada" ? colors.p1 : colors.textMuted}
          />
          <Text
            style={[styles.catTitle, category === "buscada" && { color: colors.p1 }]}
          >
            Persona buscada
          </Text>
          <Text style={styles.catDesc}>Delincuente o sospechoso identificado</Text>
        </Pressable>
      </View>

      {/* Foto */}
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
      <Field label={isBuscada ? "Descripción / motivo de búsqueda" : "Descripción"}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
          multiline
          placeholderTextColor={colors.textMuted}
          placeholder={isBuscada ? "Delito, señas particulares, contexto…" : "Vestimenta, contexto…"}
        />
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

      <PrimaryButton
        title={isBuscada ? "Publicar ficha de búsqueda" : "Publicar ficha"}
        onPress={submit}
        loading={saving}
        disabled={!valid}
      />

      <View style={{ height: 16 }} />
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
  // Categoría
  catRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  catCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  catTitle: { color: colors.text, fontSize: 14, fontWeight: "800", textAlign: "center" },
  catDesc: { color: colors.textMuted, fontSize: 11, textAlign: "center", lineHeight: 14 },

  photoBox: { gap: 10, alignItems: "center", marginTop: 4 },
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