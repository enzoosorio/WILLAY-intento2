// Avistamiento: tomar foto → embedding → comparar contra fichas activas
// (descargadas) → si max(coseno) ≥ threshold, crear sighting con match.
// Si no hay match, NO se sube la foto (cumple RF-05 estricto).
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, getDocs, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { activeMissingQuery, sightingsCol } from "@/lib/collections";
import { cosineSimilarity, getFaceEmbedder, getMatchThreshold } from "@/lib/face";
import { getCurrentWithGeohash } from "@/lib/location";
import { uploadSightingPhoto } from "@/lib/storage";
import { useAuthUser } from "@/lib/session";
import { getDb } from "@/lib/firebase";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc } from "@/types/models";

interface MatchResult {
  matched: boolean;
  similarity: number;
  missingId?: string;
  missingName?: string;
}

export default function Scan() {
  const { user } = useAuthUser();
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  async function shoot() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permiso requerido", "Activá la cámara.");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setResult(null);
    }
  }

  async function process() {
    if (!user || !photoUri) return;
    setProcessing(true);
    setResult(null);
    try {
      // 1. Descargar fichas activas + sus embeddings.
      const snap = await getDocs(activeMissingQuery());
      const fichas = snap.docs
        .map((d) => ({ id: d.id, data: d.data() as MissingPersonDoc }))
        .filter((f) => Array.isArray(f.data.embedding) && f.data.embedding.length > 0);

      // 2. Embedding del sospechoso.
      const emb = await getFaceEmbedder().embed(photoUri);

      // 3. Comparar.
      let best = { id: "", name: "", sim: 0 };
      for (const f of fichas) {
        const sim = cosineSimilarity(emb, f.data.embedding ?? []);
        if (sim > best.sim) best = { id: f.id, name: f.data.name, sim };
      }
      const threshold = getMatchThreshold();
      const matched = best.sim >= threshold;

      if (!matched) {
        setResult({ matched: false, similarity: best.sim });
        return;
      }

      // 4. Hay match: crear sighting con embedding + ubicación, subir foto.
      let loc: Awaited<ReturnType<typeof getCurrentWithGeohash>> | null = null;
      try {
        loc = await getCurrentWithGeohash();
      } catch (locationError) {
        console.warn("[scan] ubicación no disponible:", locationError);
      }
      const sightingRef = await addDoc(sightingsCol(), {
        reporterUid: user.uid,
        photoUrl: "",
        embedding: emb,
        ...(loc ? { location: loc.geopoint, geohash: loc.geohash } : {}),
        matchedMissingId: best.id,
        similarity: best.sim,
        createdAt: serverTimestamp(),
      } as never);
      try {
        const photoUrl = await uploadSightingPhoto(sightingRef.id, photoUri);
        await updateDoc(doc(getDb(), "sightings", sightingRef.id), { photoUrl });
      } catch (uploadError) {
        console.warn("[scan] foto de avistamiento no subida:", uploadError);
      }
      setResult({ matched: true, similarity: best.sim, missingId: best.id, missingName: best.name });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.h1}>Escanear avistamiento</Text>
      <Text style={styles.muted}>
        Tomá una foto y la app la comparará localmente contra fichas activas. La foto
        sólo se sube si hay coincidencia.
      </Text>

      <View style={styles.photoBox}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          </View>
        )}
        <Pressable onPress={shoot} style={styles.photoBtn}>
          <Ionicons name="camera" size={16} color={colors.text} />
          <Text style={styles.photoBtnText}>{photoUri ? "Tomar otra" : "Tomar foto"}</Text>
        </Pressable>
      </View>

      <PrimaryButton
        title={processing ? "Procesando…" : "Comparar"}
        onPress={process}
        loading={processing}
        disabled={!photoUri || processing}
      />

      {processing && <ActivityIndicator color={colors.brand} />}
      {result && (
        <View style={[styles.result, { borderColor: result.matched ? colors.success : colors.border }]}>
          <Text style={styles.resultTitle}>
            {result.matched ? "Posible coincidencia" : "Sin coincidencias"}
          </Text>
          <Text style={styles.resultMeta}>similitud: {result.similarity.toFixed(3)}</Text>
          {result.matched && (
            <>
              <Text style={styles.resultMeta}>ficha: {result.missingName}</Text>
              <Pressable
                onPress={() => router.push({ pathname: "/missing/[id]", params: { id: result.missingId! } })}
                style={styles.openBtn}
              >
                <Text style={styles.openText}>Ver ficha</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 22, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 13 },
  photoBox: { gap: 10, alignItems: "center", marginTop: 12 },
  photo: { width: 200, height: 200, borderRadius: 12 },
  photoPlaceholder: { width: 200, height: 200, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  photoBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceAlt, borderRadius: 8 },
  photoBtnText: { color: colors.text, fontSize: 13 },
  result: { padding: 14, borderRadius: 10, borderWidth: 2, backgroundColor: colors.surface, gap: 4 },
  resultTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  resultMeta: { color: colors.textMuted, fontSize: 12 },
  openBtn: { marginTop: 8, paddingVertical: 10, backgroundColor: colors.brand, borderRadius: 8, alignItems: "center" },
  openText: { color: colors.text, fontWeight: "700" },
});
