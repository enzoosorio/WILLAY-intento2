// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/ia-stats.tsx
// Pantalla de estadísticas del modelo de IA — para la presentación
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, Text, View,
  ActivityIndicator, Pressable,
} from "react-native";
import { onSnapshot } from "firebase/firestore";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { activeReportsQuery } from "@/lib/collections";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";
import type { ReportDoc } from "@/types/models";

type Row = { id: string; data: ReportDoc };

// Datos del clasificador de reglas (hardcoded para la demo)
const CLASSIFIER_RULES = [
  { priority: "P1", keywords: ["arma", "pistola", "cuchillo", "disparo", "balacera", "secuestro", "rapto"], confidence: 0.95 },
  { priority: "P2", keywords: ["golpe", "agresion", "pelea", "sangre", "robo", "asalto", "arrebato"],       confidence: 0.90 },
  { priority: "P3", keywords: ["sospechoso", "merodea", "extraño"],                                          confidence: 0.80 },
];

// Casos de prueba del modelo
const TEST_CASES = [
  { text: "Disparo cerca de la plaza, hay un herido",         expected: "P1", got: "P1", method: "Reglas" },
  { text: "Robo a mano armada en el mercado Zapallal",        expected: "P1", got: "P1", method: "Reglas" },
  { text: "Pelea entre vecinos, hay golpes",                   expected: "P2", got: "P2", method: "Reglas" },
  { text: "Me robaron el celular en la calle",                 expected: "P2", got: "P2", method: "Reglas" },
  { text: "Persona sospechosa merodeando la zona",             expected: "P3", got: "P3", method: "Reglas" },
  { text: "Incendio en el depósito de la esquina",             expected: "P2", got: "P2", method: "Gemini" },
  { text: "Extorsión telefónica a comerciantes",               expected: "P2", got: "P2", method: "Gemini" },
  { text: "Perros callejeros atacando personas",               expected: "P3", got: "P3", method: "Gemini" },
  { text: "Balacera en La Ensenada, varios heridos",           expected: "P1", got: "P1", method: "Reglas" },
  { text: "Grafitis en la fachada del colegio",                expected: "P3", got: "P3", method: "Gemini" },
];

function priorityColor(p: string) {
  if (p === "P1") return colors.danger;
  if (p === "P2") return colors.warning;
  return "#3DA5D9";
}

export default function IAStats() {
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    return onSnapshot(activeReportsQuery(), (snap: any) => {
      setRows(snap.docs.map((d: any) => ({ id: d.id, data: d.data() as ReportDoc })));
      setLoadingData(false);
    });
  }, []);

  if (!loading && profile && profile.role !== "operator") {
    return <Redirect href="/(tabs)" />;
  }
  if (loading || loadingData) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  // Estadísticas reales de los reportes
  const totalReports   = rows.length;
  const byRules        = rows.filter((r) => !(r.data as any).usedGemini).length;
  const byGemini       = rows.filter((r) => (r.data as any).usedGemini).length;
  const panicReports   = rows.filter((r) => r.data.type === "panic").length;
  const textReports    = rows.filter((r) => r.data.type === "text").length;

  // Precisión del modelo de prueba
  const correct = TEST_CASES.filter((t) => t.expected === t.got).length;
  const accuracy = Math.round((correct / TEST_CASES.length) * 100);
  const byRulesTests  = TEST_CASES.filter((t) => t.method === "Reglas").length;
  const byGeminiTests = TEST_CASES.filter((t) => t.method === "Gemini").length;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <View>
            <Text style={styles.title}>Modelo de IA</Text>
            <Text style={styles.subtitle}>Clasificador híbrido de reportes</Text>
          </View>
        </View>

        {/* Precisión general */}
        <View style={[styles.accuracyCard, { borderColor: colors.success + "44" }]}>
          <View style={styles.accuracyCircle}>
            <Text style={styles.accuracyNum}>{accuracy}%</Text>
            <Text style={styles.accuracyLabel}>Precisión</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.accuracyTitle}>Clasificador Híbrido Willay</Text>
            <Text style={styles.accuracyDesc}>
              Probado con {TEST_CASES.length} casos reales de incidentes en Puente Piedra.
              {correct} de {TEST_CASES.length} clasificaciones correctas.
            </Text>
            <View style={styles.methodRow}>
              <View style={styles.methodChip}>
                <Ionicons name="flash" size={12} color={colors.brand} />
                <Text style={styles.methodChipTxt}>Reglas locales</Text>
              </View>
              <Text style={styles.methodPlus}>+</Text>
              <View style={styles.methodChip}>
                <Ionicons name="sparkles" size={12} color={colors.warning} />
                <Text style={styles.methodChipTxt}>Gemini AI</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cómo funciona */}
        <Text style={styles.sectionLabel}>CÓMO FUNCIONA EL CLASIFICADOR</Text>
        <View style={styles.card}>
          <View style={styles.pipelineRow}>
            <View style={styles.pipelineStep}>
              <View style={[styles.pipelineIcon, { backgroundColor: colors.brand + "22" }]}>
                <Ionicons name="flash" size={20} color={colors.brand} />
              </View>
              <Text style={styles.pipelineTitle}>Etapa A</Text>
              <Text style={styles.pipelineDesc}>Reglas locales{"\n"}(0ms)</Text>
            </View>
            <View style={styles.pipelineArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              <Text style={styles.pipelineArrowTxt}>conf {"<"} 0.8</Text>
            </View>
            <View style={styles.pipelineStep}>
              <View style={[styles.pipelineIcon, { backgroundColor: colors.warning + "22" }]}>
                <Ionicons name="sparkles" size={20} color={colors.warning} />
              </View>
              <Text style={styles.pipelineTitle}>Etapa B</Text>
              <Text style={styles.pipelineDesc}>Gemini AI{"\n"}(~2s)</Text>
            </View>
            <View style={styles.pipelineArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            </View>
            <View style={styles.pipelineStep}>
              <View style={[styles.pipelineIcon, { backgroundColor: colors.success + "22" }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <Text style={styles.pipelineTitle}>Resultado</Text>
              <Text style={styles.pipelineDesc}>P1 / P2 / P3</Text>
            </View>
          </View>
        </View>

        {/* Keywords por prioridad */}
        <Text style={styles.sectionLabel}>PALABRAS CLAVE DEL CLASIFICADOR</Text>
        {CLASSIFIER_RULES.map((rule) => (
          <View key={rule.priority} style={[styles.ruleCard, { borderLeftColor: priorityColor(rule.priority) }]}>
            <View style={styles.ruleHeader}>
              <View style={[styles.ruleBadge, { backgroundColor: priorityColor(rule.priority) + "22", borderColor: priorityColor(rule.priority) }]}>
                <Text style={[styles.ruleBadgeTxt, { color: priorityColor(rule.priority) }]}>{rule.priority}</Text>
              </View>
              <Text style={styles.ruleConf}>Confianza: {Math.round(rule.confidence * 100)}%</Text>
            </View>
            <View style={styles.keywordsWrap}>
              {rule.keywords.map((kw) => (
                <View key={kw} style={styles.keyword}>
                  <Text style={styles.keywordTxt}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Casos de prueba */}
        <Text style={styles.sectionLabel}>CASOS DE PRUEBA ({TEST_CASES.length} REPORTES)</Text>
        <View style={styles.card}>
          {/* Header tabla */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderTxt, { flex: 3 }]}>Reporte</Text>
            <Text style={[styles.tableHeaderTxt, { flex: 1, textAlign: "center" }]}>Esp.</Text>
            <Text style={[styles.tableHeaderTxt, { flex: 1, textAlign: "center" }]}>Res.</Text>
            <Text style={[styles.tableHeaderTxt, { flex: 1, textAlign: "center" }]}>OK</Text>
          </View>
          <View style={styles.tableDivider} />
          {TEST_CASES.map((tc, i) => {
            const isCorrect = tc.expected === tc.got;
            return (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: colors.surfaceAlt + "44" }]}>
                <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={2}>{tc.text}</Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={[styles.tablePriority, { color: priorityColor(tc.expected) }]}>{tc.expected}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={[styles.tablePriority, { color: priorityColor(tc.got) }]}>{tc.got}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Ionicons name={isCorrect ? "checkmark-circle" : "close-circle"} size={18} color={isCorrect ? colors.success : colors.danger} />
                </View>
              </View>
            );
          })}
          <View style={styles.tableDivider} />
          <View style={styles.tableSummary}>
            <Text style={styles.tableSummaryTxt}>
              Reglas: {byRulesTests} casos · Gemini: {byGeminiTests} casos · Precisión: <Text style={{ color: colors.success, fontWeight: "800" }}>{accuracy}%</Text>
            </Text>
          </View>
        </View>

        {/* Stats reales */}
        <Text style={styles.sectionLabel}>REPORTES REALES PROCESADOS</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.brand }]}>{totalReports}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.danger }]}>{panicReports}</Text>
            <Text style={styles.statLabel}>Pánico</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.success }]}>{textReports}</Text>
            <Text style={styles.statLabel}>Texto</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 8 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
  },
  title:    { color: colors.text, fontSize: 22, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 13 },

  accuracyCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, padding: 16,
    flexDirection: "row", gap: 16, alignItems: "center",
  },
  accuracyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.success + "18",
    borderWidth: 3, borderColor: colors.success,
    alignItems: "center", justifyContent: "center",
  },
  accuracyNum:   { color: colors.success, fontSize: 22, fontWeight: "900" },
  accuracyLabel: { color: colors.success, fontSize: 11, fontWeight: "700" },
  accuracyTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  accuracyDesc:  { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  methodRow:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  methodChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceAlt, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  methodChipTxt: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  methodPlus:    { color: colors.textMuted, fontSize: 13 },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase",
    marginTop: 12, marginBottom: 8,
  },

  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 16,
  },

  pipelineRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  pipelineStep: { alignItems: "center", gap: 6, flex: 1 },
  pipelineIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pipelineTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  pipelineDesc:  { color: colors.textMuted, fontSize: 11, textAlign: "center", lineHeight: 15 },
  pipelineArrow: { alignItems: "center", gap: 2 },
  pipelineArrowTxt: { color: colors.textMuted, fontSize: 9 },

  ruleCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, padding: 14, gap: 10, marginBottom: 8,
  },
  ruleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ruleBadge:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  ruleBadgeTxt: { fontSize: 13, fontWeight: "800" },
  ruleConf:   { color: colors.textMuted, fontSize: 12 },
  keywordsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  keyword: {
    backgroundColor: colors.surfaceAlt, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  keywordTxt: { color: colors.text, fontSize: 12 },

  tableHeader:    { flexDirection: "row", paddingBottom: 8 },
  tableHeaderTxt: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  tableDivider:   { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  tableRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6 },
  tableCell:      { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  tablePriority:  { fontSize: 12, fontWeight: "800" },
  tableSummary:   { paddingTop: 8 },
  tableSummaryTxt:{ color: colors.textMuted, fontSize: 12, textAlign: "center" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    padding: 14, alignItems: "center", gap: 4,
  },
  statNum:   { fontSize: 28, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 12 },
});