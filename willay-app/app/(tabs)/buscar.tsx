// Pantalla ADMIN: lista de todas las personas (perdidas + buscadas) y
// búsqueda por rostro. El admin toma/sube una foto y el sistema la compara
// con las fichas para localizar a la persona por sus rasgos faciales.
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, getDocs, onSnapshot, serverTimestamp, updateDoc, doc, type QueryDocumentSnapshot } from "firebase/firestore";
import { Redirect, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { activeMissingQuery, sightingsCol } from "@/lib/collections";
import { cosineSimilarity, getFaceEmbedder, getMatchThreshold } from "@/lib/face";
import { getCurrentWithGeohash } from "@/lib/location";
import { uploadSightingPhoto } from "@/lib/storage";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { getDb } from "@/lib/firebase";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc, PersonCategory } from "@/types/models";

type Row = { id: string; data: MissingPersonDoc };

// ════════════════════════════════════════════════════════════════════
// ScanOverlay — animación futurista de escaneo facial.
// Una línea de barrido que sube y baja sobre la foto + esquinas de "mira".
// Usa setInterval + estado (no Animated nativo) para que sea fluido en
// Expo Go sin librerías extra.
// ════════════════════════════════════════════════════════════════════
function ScanOverlay({ size }: { size: number }) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const DURATION = 1600; // ida y vuelta
    const STEP = 30;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) % DURATION;
      // 0 → 1 → 0 (ping-pong) con onda triangular
      const phase = elapsed / DURATION; // 0..1
      const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // 0..1..0
      setT(tri);
    }, STEP);
    return () => clearInterval(id);
  }, []);

  const lineTop = 8 + t * (size - 16); // posición vertical de la línea
  const corner = 26; // tamaño de las esquinas

  return (
    <View style={[styles.scanWrap, { width: size, height: size }]} pointerEvents="none">
      {/* Velo oscuro translúcido */}
      <View style={styles.scanVeil} />

      {/* Línea de barrido */}
      <View style={[styles.scanLine, { top: lineTop }]} />
      {/* Halo de la línea (estela) */}
      <View style={[styles.scanGlow, { top: lineTop - 14 }]} />

      {/* Esquinas tipo mira de cámara */}
      <View style={[styles.corner, styles.cornerTL, { width: corner, height: corner }]} />
      <View style={[styles.corner, styles.cornerTR, { width: corner, height: corner }]} />
      <View style={[styles.corner, styles.cornerBL, { width: corner, height: corner }]} />
      <View style={[styles.corner, styles.cornerBR, { width: corner, height: corner }]} />

      {/* Texto de estado */}
      <View style={styles.scanLabel}>
        <Text style={styles.scanLabelText}>ESCANEANDO</Text>
      </View>
    </View>
  );
}


interface MatchResult {
  matched: boolean;
  similarity: number;
  missingId?: string;
  missingName?: string;
  category?: PersonCategory;
}

export default function Buscar() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<PersonCategory>("perdida");

  // Estado del escaneo facial
  const [scanVisible, setScanVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    return onSnapshot(activeMissingQuery(), (snap) =>
      setRows(
        snap.docs.map((d: QueryDocumentSnapshot<MissingPersonDoc>) => ({
          id: d.id,
          data: d.data(),
        })),
      ),
    );
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => (r.data.category ?? "perdida") === tab),
    [rows, tab],
  );

  const countPerdidas = rows.filter((r) => (r.data.category ?? "perdida") === "perdida").length;
  const countBuscadas = rows.filter((r) => r.data.category === "buscada").length;

  async function shoot() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permiso requerido", "Activa la cámara.");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setResult(null);
    }
  }

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
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
      // Pequeña pausa para que se aprecie la animación de escaneo (demo).
      await new Promise((r) => setTimeout(r, 1800));

      // 1. Descargar fichas + embeddings.
      const snap = await getDocs(activeMissingQuery());
      const todas = snap.docs.map((d) => ({ id: d.id, data: d.data() as MissingPersonDoc }));
      const fichas = todas.filter(
        (f) => Array.isArray(f.data.embedding) && f.data.embedding.length > 0,
      );

      // DIAGNÓSTICO (temporal): ver cuántas fichas hay y cuáles tienen huella.
      console.log("[buscar] total fichas:", todas.length, "| con embedding:", fichas.length);

      // 2. Embedding de la foto buscada.
      const emb = await getFaceEmbedder().embed(photoUri);
      console.log("[buscar] dim embedding foto:", emb.length);

      // 3. Comparar contra todas.
      let best = { id: "", name: "", sim: 0, category: "perdida" as PersonCategory };
      for (const f of fichas) {
        const sim = cosineSimilarity(emb, f.data.embedding ?? []);
        console.log(`[buscar] ${f.data.name}: similitud ${(sim * 100).toFixed(1)}% (dim ficha ${f.data.embedding?.length})`);
        if (sim > best.sim) {
          best = {
            id: f.id,
            name: f.data.name,
            sim,
            category: f.data.category ?? "perdida",
          };
        }
      }
      const threshold = getMatchThreshold();
      console.log("[buscar] mejor similitud:", (best.sim * 100).toFixed(1) + "%", "| umbral:", (threshold * 100) + "%");
      const matched = best.sim >= threshold;

      if (!matched) {
        setResult({ matched: false, similarity: best.sim });
        return;
      }

      // 4. Registrar el avistamiento (ubicación + foto).
      const loc = await getCurrentWithGeohash();
      const sightingRef = await addDoc(sightingsCol(), {
        reporterUid: user.uid,
        photoUrl: "",
        embedding: emb,
        location: loc.geopoint,
        geohash: loc.geohash,
        matchedMissingId: best.id,
        similarity: best.sim,
        createdAt: serverTimestamp(),
      } as never);
      const photoUrl = await uploadSightingPhoto(sightingRef.id, photoUri);
      await updateDoc(doc(getDb(), "sightings", sightingRef.id), { photoUrl });

      setResult({
        matched: true,
        similarity: best.sim,
        missingId: best.id,
        missingName: best.name,
        category: best.category,
      });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function openScan() {
    // Limpiar SIEMPRE el estado anterior antes de abrir, para no mostrar
    // la foto ni el resultado de una búsqueda previa.
    setPhotoUri(null);
    setResult(null);
    setProcessing(false);
    setScanVisible(true);
  }

  function closeScan() {
    setScanVisible(false);
    setPhotoUri(null);
    setResult(null);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  // Guardia: solo operador (después de los hooks, posición segura)
  if (profile && profile.role !== "operator") {
    return <Redirect href="/(tabs)" />;
  }

  const isBuscada = tab === "buscada";

  return (
    <Screen padded={false}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="people" size={22} color={colors.warning} />
          <Text style={styles.h1}>Personas registradas</Text>
        </View>
      </View>

      {/* Botón de búsqueda facial */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Pressable style={styles.searchBtn} onPress={openScan}>
          <Ionicons name="scan" size={20} color="#fff" />
          <Text style={styles.searchBtnText}>Buscar persona por rostro</Text>
        </Pressable>
      </View>

      {/* Pestañas */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("perdida")}
          style={[styles.tab, tab === "perdida" && { borderBottomColor: colors.brand }]}
        >
          <Ionicons name="help-buoy" size={16} color={tab === "perdida" ? colors.brand : colors.textMuted} />
          <Text style={[styles.tabText, tab === "perdida" && { color: colors.text }]}>
            Desaparecidas ({countPerdidas})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("buscada")}
          style={[styles.tab, tab === "buscada" && { borderBottomColor: colors.p1 }]}
        >
          <Ionicons name="alert-circle" size={16} color={tab === "buscada" ? colors.p1 : colors.textMuted} />
          <Text style={[styles.tabText, tab === "buscada" && { color: colors.text }]}>
            Buscadas ({countBuscadas})
          </Text>
        </Pressable>
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="folder-open" size={44} color={colors.textMuted} />
            <Text style={styles.empty}>
              {isBuscada ? "Sin personas buscadas." : "Sin personas desaparecidas."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, isBuscada && { borderColor: colors.p1 + "55" }]}>
            <Pressable
              onPress={() => router.push({ pathname: "/missing/[id]", params: { id: item.id } })}
              style={styles.cardMain}
            >
              {item.data.photoUrl ? (
                <Image source={{ uri: item.data.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={28} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.data.name}, {item.data.age} años</Text>
                  {isBuscada && (
                    <View style={styles.wantedTag}>
                      <Ionicons name="warning" size={10} color="#fff" />
                      <Text style={styles.wantedTagText}>BUSCADO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.desc} numberOfLines={2}>{item.data.description}</Text>
              </View>
            </Pressable>

            {/* Botón Localizar: ver avistamientos en el mapa */}
            <Pressable
              onPress={() => router.push({ pathname: "/localizar/[id]", params: { id: item.id } })}
              style={styles.locateBtn}
            >
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.locateText}>Localizar</Text>
            </Pressable>
          </View>
        )}
      />

      {/* ════════ MODAL: BÚSQUEDA POR ROSTRO ════════ */}
      <Modal visible={scanVisible} animationType="slide" onRequestClose={closeScan}>
        <Screen scroll>
          <View style={styles.modalHead}>
            <Text style={styles.h1}>Buscar persona por rostro</Text>
            <Pressable onPress={closeScan}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <Text style={styles.muted}>
            Toma o sube una foto. El sistema la compara con las fichas registradas
            para localizar a la persona por sus rasgos faciales.
          </Text>

          <View style={styles.photoBox}>
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={styles.photo} />
                {processing && <ScanOverlay size={200} />}
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="scan-outline" size={48} color={colors.textMuted} />
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={shoot} style={styles.photoBtn} disabled={processing}>
                <Ionicons name="camera" size={16} color={colors.text} />
                <Text style={styles.photoBtnText}>Cámara</Text>
              </Pressable>
              <Pressable onPress={pick} style={styles.photoBtn} disabled={processing}>
                <Ionicons name="image" size={16} color={colors.text} />
                <Text style={styles.photoBtnText}>Galería</Text>
              </Pressable>
            </View>
          </View>

          <PrimaryButton
            title={processing ? "Analizando rostro…" : "Buscar coincidencia"}
            onPress={process}
            loading={processing}
            disabled={!photoUri || processing}
          />

          {result && (
            <View
              style={[
                styles.result,
                { borderColor: result.matched ? colors.success : colors.border },
              ]}
            >
              <Ionicons
                name={result.matched ? "checkmark-circle" : "close-circle"}
                size={32}
                color={result.matched ? colors.success : colors.textMuted}
              />
              <Text style={styles.resultTitle}>
                {result.matched ? "¡Coincidencia encontrada!" : "Sin coincidencias"}
              </Text>
              <Text style={styles.resultMeta}>
                Similitud: {(result.similarity * 100).toFixed(1)}%
              </Text>
              {result.matched && (
                <>
                  <Text style={styles.resultName}>{result.missingName}</Text>
                  <Text style={styles.resultMeta}>
                    {result.category === "buscada" ? "⚠️ Persona buscada" : "🛟 Persona desaparecida"}
                  </Text>
                  <Text style={styles.resultHint}>
                    Se registró el avistamiento con la ubicación actual.
                  </Text>
                  <Pressable
                    onPress={() => {
                      closeScan();
                      router.push({ pathname: "/missing/[id]", params: { id: result.missingId! } });
                    }}
                    style={styles.openBtn}
                  >
                    <Text style={styles.openText}>Ver ficha completa</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          <View style={{ height: 24 }} />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  h1: { color: colors.text, fontSize: 20, fontWeight: "800" },

  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.warning,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },

  list: { padding: 20, gap: 10 },
  emptyWrap: { alignItems: "center", marginTop: 50, gap: 10 },
  empty: { color: colors.textMuted, textAlign: "center", fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 10,
    borderRadius: 8,
  },
  locateText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { color: colors.text, fontWeight: "700" },
  wantedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.p1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wantedTagText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  // Modal de escaneo
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  photoBox: { gap: 10, alignItems: "center", marginVertical: 16 },
  photo: { width: 200, height: 200, borderRadius: 12 },

  // Animación de escaneo
  scanWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 12,
    overflow: "hidden",
  },
  scanVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 20, 40, 0.35)",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: "#22E0C8",
    shadowColor: "#22E0C8",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  scanGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: "rgba(34, 224, 200, 0.18)",
  },
  corner: {
    position: "absolute",
    borderColor: "#22E0C8",
  },
  cornerTL: { top: 6, left: 6, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 6, right: 6, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 6, left: 6, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 6, right: 6, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanLabel: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanLabelText: {
    color: "#22E0C8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
  },
  photoBtnText: { color: colors.text, fontSize: 13 },
  result: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.surface,
    gap: 4,
    alignItems: "center",
    marginTop: 8,
  },
  resultTitle: { color: colors.text, fontWeight: "800", fontSize: 17, marginTop: 4 },
  resultName: { color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 4 },
  resultMeta: { color: colors.textMuted, fontSize: 13 },
  resultHint: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 4 },
  openBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.brand,
    borderRadius: 10,
    alignItems: "center",
  },
  openText: { color: "#fff", fontWeight: "700" },
});