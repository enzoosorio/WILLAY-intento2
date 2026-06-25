import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, Image, Modal, Pressable,
  StyleSheet, Text, TextInput, View, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, getDocs, onSnapshot, serverTimestamp, updateDoc, doc, type QueryDocumentSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { activeMissingQuery, activeReportsQuery, sightingsCol } from "@/lib/collections";
import { cosineSimilarity, getFaceEmbedder, getMatchThreshold } from "@/lib/face";
import { getCurrentWithGeohash } from "@/lib/location";
import { uploadSightingPhoto } from "@/lib/storage";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { getDb } from "@/lib/firebase";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc, PersonCategory, ReportDoc } from "@/types/models";

type MissingRow = { id: string; data: MissingPersonDoc };
type ReportRow  = { id: string; data: ReportDoc };
type MainTab    = "reportes" | "personas";
type PersonTab  = "perdida" | "buscada";

interface MatchResult {
  matched: boolean; similarity: number;
  missingId?: string; missingName?: string; category?: PersonCategory;
}

function ScanOverlay({ size }: { size: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const DURATION = 1600;
    const start = Date.now();
    const id = setInterval(() => {
      const phase = ((Date.now() - start) % DURATION) / DURATION;
      setT(phase < 0.5 ? phase * 2 : (1 - phase) * 2);
    }, 30);
    return () => clearInterval(id);
  }, []);
  const lineTop = 8 + t * (size - 16);
  const C = 26;
  return (
    <View style={[ss.scanWrap, { width: size, height: size }]} pointerEvents="none">
      <View style={ss.scanVeil} />
      <View style={[ss.scanLine, { top: lineTop }]} />
      <View style={[ss.scanGlow, { top: lineTop - 14 }]} />
      <View style={[ss.corner, ss.cornerTL, { width: C, height: C }]} />
      <View style={[ss.corner, ss.cornerTR, { width: C, height: C }]} />
      <View style={[ss.corner, ss.cornerBL, { width: C, height: C }]} />
      <View style={[ss.corner, ss.cornerBR, { width: C, height: C }]} />
      <View style={ss.scanLabel}><Text style={ss.scanLabelText}>ESCANEANDO</Text></View>
    </View>
  );
}

function priorityColor(p?: string) {
  if (p === "P1") return colors.danger;
  if (p === "P2") return colors.warning;
  return "#3DA5D9";
}

export default function Buscar() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const router = useRouter();
  const isOperator = profile?.role === "operator";

  const [mainTab,    setMainTab]    = useState<MainTab>("reportes");
  const [personTab,  setPersonTab]  = useState<PersonTab>("perdida");
  const [search,     setSearch]     = useState("");
  const [missing,    setMissing]    = useState<MissingRow[]>([]);
  const [reports,    setReports]    = useState<ReportRow[]>([]);
  const [scanVisible, setScanVisible] = useState(false);
  const [photoUri,   setPhotoUri]   = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result,     setResult]     = useState<MatchResult | null>(null);

  useEffect(() => {
    const u1 = onSnapshot(activeMissingQuery(), (snap) =>
      setMissing(snap.docs.map((d: QueryDocumentSnapshot<MissingPersonDoc>) => ({ id: d.id, data: d.data() })))
    );
    const u2 = onSnapshot(activeReportsQuery(), (snap) =>
      setReports(snap.docs.map((d: QueryDocumentSnapshot<ReportDoc>) => ({ id: d.id, data: d.data() })))
    );
    return () => { u1(); u2(); };
  }, []);

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter((r) =>
      r.data.text?.toLowerCase().includes(q) ||
      (r.data as any).categoryLabel?.toLowerCase().includes(q) ||
      (r.data as any).authorName?.toLowerCase().includes(q) ||
      (r.data as any).zone?.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const filteredMissing = useMemo(() => {
    const byTab = missing.filter((m) => (m.data.category ?? "perdida") === personTab);
    if (!search.trim()) return byTab;
    const q = search.toLowerCase();
    return byTab.filter((m) =>
      m.data.name.toLowerCase().includes(q) ||
      m.data.description?.toLowerCase().includes(q) ||
      m.data.lastSeenZone?.toLowerCase().includes(q)
    );
  }, [missing, personTab, search]);

  const countPerdidas = missing.filter((m) => (m.data.category ?? "perdida") === "perdida").length;
  const countBuscadas = missing.filter((m) => m.data.category === "buscada").length;

  async function shoot() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permiso requerido", "Activa la cámara.");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets[0]) { setPhotoUri(res.assets[0].uri); setResult(null); }
  }

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!res.canceled && res.assets[0]) { setPhotoUri(res.assets[0].uri); setResult(null); }
  }

  async function process() {
    if (!user || !photoUri) return;
    setProcessing(true); setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      const snap = await getDocs(activeMissingQuery());
      const fichas = snap.docs
        .map((d) => ({ id: d.id, data: d.data() as MissingPersonDoc }))
        .filter((f) => Array.isArray(f.data.embedding) && f.data.embedding.length > 0);
      const emb = await getFaceEmbedder().embed(photoUri);
      let best = { id: "", name: "", sim: 0, category: "perdida" as PersonCategory };
      for (const f of fichas) {
        const sim = cosineSimilarity(emb, f.data.embedding ?? []);
        if (sim > best.sim) best = { id: f.id, name: f.data.name, sim, category: f.data.category ?? "perdida" };
      }
      const matched = best.sim >= getMatchThreshold();
      if (!matched) { setResult({ matched: false, similarity: best.sim }); return; }
      let loc: Awaited<ReturnType<typeof getCurrentWithGeohash>> | null = null;
      try {
        loc = await getCurrentWithGeohash();
      } catch (locationError) {
        console.warn("[buscar] ubicación no disponible:", locationError);
      }
      const sRef = await addDoc(sightingsCol(), {
        reporterUid: user.uid, photoUrl: "", embedding: emb,
        ...(loc ? { location: loc.geopoint, geohash: loc.geohash } : {}),
        matchedMissingId: best.id, similarity: best.sim,
        createdAt: serverTimestamp(),
      } as never);
      try {
        const photoUrl = await uploadSightingPhoto(sRef.id, photoUri);
        await updateDoc(doc(getDb(), "sightings", sRef.id), { photoUrl });
      } catch (uploadError) {
        console.warn("[buscar] foto de avistamiento no subida:", uploadError);
      }
      setResult({ matched: true, similarity: best.sim, missingId: best.id, missingName: best.name, category: best.category });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function openScan() { setPhotoUri(null); setResult(null); setProcessing(false); setScanVisible(true); }
  function closeScan() { setScanVisible(false); setPhotoUri(null); setResult(null); }

  if (loading) return <View style={ss.center}><ActivityIndicator size="large" color={colors.brand} /></View>;

  return (
    <Screen padded={false}>
      {/* Header */}
      <View style={ss.header}>
        <Text style={ss.title}>Buscar</Text>
        <Text style={ss.subtitle}>{reports.length} reportes · {missing.length} personas</Text>
      </View>

      {/* SearchBar */}
      <View style={ss.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={ss.searchInput}
          placeholder="Buscar por tipo, zona, nombre..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Tabs principales */}
      <View style={ss.tabBar}>
        <Pressable onPress={() => setMainTab("reportes")} style={[ss.tab, mainTab === "reportes" && { borderBottomColor: colors.brand }]}>
          <Ionicons name="document-text" size={15} color={mainTab === "reportes" ? colors.brand : colors.textMuted} />
          <Text style={[ss.tabTxt, mainTab === "reportes" && { color: colors.text }]}>Reportes ({filteredReports.length})</Text>
        </Pressable>
        <Pressable onPress={() => setMainTab("personas")} style={[ss.tab, mainTab === "personas" && { borderBottomColor: colors.brand }]}>
          <Ionicons name="people" size={15} color={mainTab === "personas" ? colors.brand : colors.textMuted} />
          <Text style={[ss.tabTxt, mainTab === "personas" && { color: colors.text }]}>Personas ({missing.length})</Text>
        </Pressable>
      </View>

      {/* Contenido */}
      {mainTab === "reportes" ? (
        <FlatList
          data={filteredReports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={ss.list}
          ListEmptyComponent={
            <View style={ss.emptyWrap}>
              <Ionicons name="search-outline" size={44} color={colors.border} />
              <Text style={ss.emptyTxt}>{search ? "Sin resultados para tu búsqueda" : "Sin reportes activos"}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPanic = item.data.type === "panic";
            const pColor  = priorityColor(item.data.priority);
            return (
              <Pressable
                style={[ss.reportCard, { borderLeftColor: pColor }]}
                onPress={() => router.push({ pathname: "/report/[id]", params: { id: item.id } })}
              >
                <View style={ss.reportTop}>
                  <View style={[ss.priorityBadge, { backgroundColor: pColor + "22", borderColor: pColor }]}>
                    <Text style={[ss.priorityTxt, { color: pColor }]}>{item.data.priority ?? "P3"}</Text>
                  </View>
                  <Text style={ss.reportType}>{isPanic ? "Alerta de Pánico" : ((item.data as any).categoryLabel ?? "Reporte")}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.border} />
                </View>
                {item.data.text && <Text style={ss.reportText} numberOfLines={2}>{item.data.text}</Text>}
                <View style={ss.reportMeta}>
                  {(item.data as any).authorName && (
                    <View style={ss.metaChip}>
                      <Ionicons name="person-circle-outline" size={12} color={colors.textMuted} />
                      <Text style={ss.metaTxt}>{(item.data as any).authorName}</Text>
                    </View>
                  )}
                  {(item.data as any).zone && (
                    <View style={ss.metaChip}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={ss.metaTxt}>{(item.data as any).zone}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <>
          {/* Sub-tabs personas + botón scan */}
          <View style={ss.personHeader}>
            <View style={ss.personTabs}>
              <Pressable onPress={() => setPersonTab("perdida")} style={[ss.personTab, personTab === "perdida" && { backgroundColor: colors.brand }]}>
                <Text style={[ss.personTabTxt, personTab === "perdida" && { color: "white" }]}>Perdidas ({countPerdidas})</Text>
              </Pressable>
              <Pressable onPress={() => setPersonTab("buscada")} style={[ss.personTab, personTab === "buscada" && { backgroundColor: colors.danger }]}>
                <Text style={[ss.personTabTxt, personTab === "buscada" && { color: "white" }]}>Buscadas ({countBuscadas})</Text>
              </Pressable>
            </View>
            {isOperator && (
              <Pressable style={ss.scanBtn} onPress={openScan}>
                <Ionicons name="scan" size={16} color="white" />
                <Text style={ss.scanBtnTxt}>Escanear</Text>
              </Pressable>
            )}
          </View>

          <FlatList
            data={filteredMissing}
            keyExtractor={(m) => m.id}
            contentContainerStyle={ss.list}
            ListEmptyComponent={
              <View style={ss.emptyWrap}>
                <Ionicons name="people-outline" size={44} color={colors.border} />
                <Text style={ss.emptyTxt}>{search ? "Sin resultados" : personTab === "perdida" ? "Sin personas desaparecidas" : "Sin personas buscadas"}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isBuscada = item.data.category === "buscada";
              const accentColor = isBuscada ? colors.danger : colors.brand;
              return (
                <Pressable
                  style={[ss.personCard, { borderLeftColor: accentColor }]}
                  onPress={() => router.push({ pathname: "/missing/[id]", params: { id: item.id } })}
                >
                  {item.data.photoUrl ? (
                    <Image source={{ uri: item.data.photoUrl }} style={ss.avatar} />
                  ) : (
                    <View style={[ss.avatar, ss.avatarPlaceholder]}>
                      <Ionicons name="person" size={26} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={ss.personNameRow}>
                      <Text style={ss.personName} numberOfLines={1}>{item.data.name}</Text>
                      <View style={[ss.personBadge, { backgroundColor: accentColor }]}>
                        <Text style={ss.personBadgeTxt}>{isBuscada ? "BUSCADA" : "PERDIDA"}</Text>
                      </View>
                    </View>
                    <Text style={ss.personAge}>{item.data.age} años · {item.data.lastSeenZone}</Text>
                    <Text style={ss.personDesc} numberOfLines={2}>{item.data.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </Pressable>
              );
            }}
          />
        </>
      )}

      {/* Modal escaneo facial */}
      <Modal visible={scanVisible} animationType="slide" onRequestClose={closeScan}>
        <Screen scroll>
          <View style={ss.modalHead}>
            <Text style={ss.title}>Búsqueda Facial</Text>
            <Pressable onPress={closeScan}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <Text style={ss.modalDesc}>Toma o sube una foto. El sistema la compara con las fichas registradas usando reconocimiento facial.</Text>

          <View style={ss.photoBox}>
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={ss.photo} />
                {processing && <ScanOverlay size={200} />}
              </View>
            ) : (
              <View style={ss.photoPlaceholder}>
                <Ionicons name="scan-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>Selecciona una foto</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={shoot} style={ss.photoBtn} disabled={processing}>
                <Ionicons name="camera" size={16} color={colors.text} />
                <Text style={ss.photoBtnTxt}>Cámara</Text>
              </Pressable>
              <Pressable onPress={pick} style={ss.photoBtn} disabled={processing}>
                <Ionicons name="image" size={16} color={colors.text} />
                <Text style={ss.photoBtnTxt}>Galería</Text>
              </Pressable>
            </View>
          </View>

          <PrimaryButton
            title={processing ? "Analizando rostro..." : "Buscar coincidencia"}
            onPress={process}
            loading={processing}
            disabled={!photoUri || processing}
          />

          {result && (
            <View style={[ss.result, { borderColor: result.matched ? colors.success : colors.border }]}>
              <Ionicons name={result.matched ? "checkmark-circle" : "close-circle"} size={36} color={result.matched ? colors.success : colors.textMuted} />
              <Text style={ss.resultTitle}>{result.matched ? "¡Coincidencia encontrada!" : "Sin coincidencias"}</Text>
              <Text style={ss.resultMeta}>Similitud: {(result.similarity * 100).toFixed(1)}%</Text>
              {result.matched && (
                <>
                  <Text style={ss.resultName}>{result.missingName}</Text>
                  <Text style={ss.resultMeta}>{result.category === "buscada" ? "⚠️ Persona buscada" : "🛟 Persona desaparecida"}</Text>
                  <Pressable onPress={() => { closeScan(); router.push({ pathname: "/missing/[id]", params: { id: result.missingId! } }); }} style={ss.openBtn}>
                    <Text style={ss.openBtnTxt}>Ver ficha completa</Text>
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

const ss = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:    { color: colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 48,
    marginHorizontal: 16, marginBottom: 12,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },

  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, marginBottom: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabTxt: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },

  list: { padding: 16, gap: 10 },
  emptyWrap: { alignItems: "center", marginTop: 50, gap: 10 },
  emptyTxt: { color: colors.textMuted, fontSize: 14, textAlign: "center" },

  // Reportes
  reportCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, padding: 14, gap: 6,
  },
  reportTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  priorityBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityTxt:   { fontSize: 11, fontWeight: "800" },
  reportType:    { color: colors.text, fontWeight: "700", fontSize: 13, flex: 1 },
  reportText:    { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  reportMeta:    { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metaChip:      { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:       { color: colors.textMuted, fontSize: 11 },

  // Personas
  personHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  personTabs:   { flexDirection: "row", gap: 8, flex: 1 },
  personTab: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  personTabTxt: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  scanBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.warning,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
  },
  scanBtnTxt: { color: "white", fontSize: 12, fontWeight: "700" },

  personCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, padding: 14,
  },
  avatar:            { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceAlt },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  personNameRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  personName:        { color: colors.text, fontWeight: "800", fontSize: 14, flex: 1 },
  personBadge:       { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  personBadgeTxt:    { color: "white", fontSize: 10, fontWeight: "800" },
  personAge:         { color: colors.textMuted, fontSize: 12 },
  personDesc:        { color: colors.textMuted, fontSize: 12, lineHeight: 16 },

  // Modal escaneo
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  photoBox:  { gap: 12, alignItems: "center", marginVertical: 16 },
  photo:     { width: 200, height: 200, borderRadius: 12 },
  photoPlaceholder: {
    width: 200, height: 200, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  photoBtn: {
    flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.surfaceAlt, borderRadius: 10,
  },
  photoBtnTxt: { color: colors.text, fontSize: 13 },
  result: {
    padding: 18, borderRadius: 14, borderWidth: 2,
    backgroundColor: colors.surface, gap: 6, alignItems: "center", marginTop: 12,
  },
  resultTitle: { color: colors.text, fontWeight: "800", fontSize: 17, marginTop: 4 },
  resultName:  { color: colors.text, fontWeight: "700", fontSize: 15 },
  resultMeta:  { color: colors.textMuted, fontSize: 13 },
  openBtn:     { marginTop: 10, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.brand, borderRadius: 12 },
  openBtnTxt:  { color: "white", fontWeight: "700", fontSize: 14 },

  // Scan overlay
  scanWrap:      { position: "absolute", top: 0, left: 0, borderRadius: 12, overflow: "hidden" },
  scanVeil:      { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,20,40,0.35)" },
  scanLine:      { position: "absolute", left: 0, right: 0, height: 2.5, backgroundColor: "#22E0C8", shadowColor: "#22E0C8", shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  scanGlow:      { position: "absolute", left: 0, right: 0, height: 28, backgroundColor: "rgba(34,224,200,0.18)" },
  corner:        { position: "absolute", borderColor: "#22E0C8" },
  cornerTL:      { top: 6, left: 6, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR:      { top: 6, right: 6, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL:      { bottom: 6, left: 6, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR:      { bottom: 6, right: 6, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanLabel:     { position: "absolute", bottom: 12, alignSelf: "center", left: 0, right: 0, alignItems: "center" },
  scanLabelText: { color: "#22E0C8", fontSize: 12, fontWeight: "800", letterSpacing: 3 },
});