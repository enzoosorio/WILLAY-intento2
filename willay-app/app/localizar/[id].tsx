// Pantalla ADMIN: muestra dónde se ha visto a una persona (avistamientos)
// en un mapa, para localizarla. Se abre desde el botón "Localizar" en Buscar.
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { Screen } from "@/components/ui/Screen";
import { missingPersonDoc, sightingsCol } from "@/lib/collections";
import { colors } from "@/theme/colors";
import type { MissingPersonDoc, SightingDoc } from "@/types/models";

type Sighting = { id: string; data: SightingDoc };

export default function Localizar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [person, setPerson] = useState<MissingPersonDoc | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos de la persona
  useEffect(() => {
    if (!id) return;
    return onSnapshot(missingPersonDoc(id), (snap) => {
      setPerson(snap.exists() ? (snap.data() as MissingPersonDoc) : null);
    });
  }, [id]);

  // Cargar avistamientos de esta persona
  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const q = query(
          sightingsCol(),
          where("matchedMissingId", "==", id),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        if (!active) return;
        setSightings(
          snap.docs.map((d) => ({ id: d.id, data: d.data() as SightingDoc })),
        );
      } catch (e) {
        // Si falta el índice de Firestore, intentamos sin orderBy
        try {
          const q2 = query(sightingsCol(), where("matchedMissingId", "==", id));
          const snap2 = await getDocs(q2);
          if (!active) return;
          setSightings(
            snap2.docs.map((d) => ({ id: d.id, data: d.data() as SightingDoc })),
          );
        } catch {
          // sin avistamientos
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brand} size="large" />
      </Screen>
    );
  }

  if (!person) {
    return (
      <Screen>
        <Text style={{ color: colors.textMuted }}>Persona no encontrada.</Text>
      </Screen>
    );
  }

  const isBuscada = person.category === "buscada";

  // Avistamientos que tienen ubicación
  const withLocation = sightings.filter((s) => s.data.location);

  // Región inicial del mapa: centrada en el avistamiento más reciente,
  // o en Puente Piedra si no hay ninguno.
  const initialRegion = withLocation[0]
    ? {
        latitude: withLocation[0].data.location.latitude,
        longitude: withLocation[0].data.location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: -11.865,
        longitude: -77.076,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

  return (
    <Screen scroll>
      {/* Cabecera con la persona */}
      <View style={styles.personCard}>
        {person.photoUrl ? (
          <Image source={{ uri: person.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={28} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {person.name}, {person.age} años
            </Text>
            {isBuscada && (
              <View style={styles.wantedTag}>
                <Ionicons name="warning" size={10} color="#fff" />
                <Text style={styles.wantedTagText}>BUSCADO</Text>
              </View>
            )}
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {person.description}
          </Text>
        </View>
      </View>

      {/* Resumen de avistamientos */}
      <View style={styles.summary}>
        <Ionicons name="location" size={18} color={colors.brand} />
        <Text style={styles.summaryText}>
          {withLocation.length === 0
            ? "Sin avistamientos registrados aún"
            : `${withLocation.length} avistamiento${withLocation.length > 1 ? "s" : ""} registrado${withLocation.length > 1 ? "s" : ""}`}
        </Text>
      </View>

      {/* Mapa con los avistamientos */}
      {withLocation.length > 0 ? (
        <View style={styles.mapWrap}>
          <MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={initialRegion}>
            {withLocation.map((s, idx) => (
              <Marker
                key={s.id}
                coordinate={{
                  latitude: s.data.location.latitude,
                  longitude: s.data.location.longitude,
                }}
                title={idx === 0 ? "Último avistamiento" : `Avistamiento ${withLocation.length - idx}`}
                description={
                  s.data.createdAt
                    ? new Date((s.data.createdAt as any).seconds * 1000).toLocaleString()
                    : "Fecha desconocida"
                }
                pinColor={idx === 0 ? "#FF3B3B" : "#F5A524"}
              />
            ))}
          </MapView>
        </View>
      ) : (
        <View style={styles.emptyMap}>
          <Ionicons name="map-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Cuando se detecte a esta persona con la búsqueda por rostro, su
            ubicación aparecerá aquí en el mapa.
          </Text>
        </View>
      )}

      {/* Lista de avistamientos */}
      {withLocation.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Historial de avistamientos</Text>
          {withLocation.map((s, idx) => (
            <View key={s.id} style={styles.sightRow}>
              <View
                style={[
                  styles.sightDot,
                  { backgroundColor: idx === 0 ? "#FF3B3B" : "#F5A524" },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.sightTitle}>
                  {idx === 0 ? "Último avistamiento" : `Avistamiento ${withLocation.length - idx}`}
                </Text>
                <Text style={styles.sightMeta}>
                  {s.data.createdAt
                    ? new Date((s.data.createdAt as any).seconds * 1000).toLocaleString()
                    : "Fecha desconocida"}
                </Text>
                {s.data.similarity != null && (
                  <Text style={styles.sightMeta}>
                    Coincidencia: {(s.data.similarity * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
              {s.data.photoUrl ? (
                <Image source={{ uri: s.data.photoUrl }} style={styles.sightPhoto} />
              ) : null}
            </View>
          ))}
        </>
      )}

      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  personCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { color: colors.text, fontWeight: "700", fontSize: 15 },
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

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  summaryText: { color: colors.text, fontSize: 14, fontWeight: "600" },

  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    height: 300,
  },
  map: { width: "100%", height: "100%" },

  emptyMap: {
    alignItems: "center",
    gap: 10,
    padding: 30,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },

  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  sightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  sightDot: { width: 10, height: 10, borderRadius: 5 },
  sightTitle: { color: colors.text, fontWeight: "700", fontSize: 13 },
  sightMeta: { color: colors.textMuted, fontSize: 12 },
  sightPhoto: { width: 48, height: 48, borderRadius: 8 },
});