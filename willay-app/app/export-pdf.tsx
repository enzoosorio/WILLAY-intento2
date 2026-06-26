// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/app/export-pdf.tsx
// Exportación de incidencias en PDF para el operador
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  Share, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getDocs, query, collection, where, orderBy, Timestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";

type RangeOption = "hoy" | "semana" | "mes" | "todo";

interface ReportRow {
  id: string;
  priority: string;
  status: string;
  type: string;
  categoryLabel: string;
  text: string;
  zone: string;
  authorName: string;
  createdAt: any;
}

function priorityColor(p: string) {
  if (p === "P1") return "#E53E3E";
  if (p === "P2") return "#DD6B20";
  return "#3182CE";
}

function statusLabel(s: string) {
  if (s === "received")  return "Recibido";
  if (s === "attending") return "En atención";
  if (s === "closed")    return "Cerrado";
  if (s === "dismissed") return "Descartado";
  return s;
}

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getRangeStart(range: RangeOption): Date | null {
  const now = new Date();
  if (range === "hoy") {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
  }
  if (range === "semana") {
    const d = new Date(now); d.setDate(d.getDate() - 7); return d;
  }
  if (range === "mes") {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d;
  }
  return null;
}

function generateHTML(reports: ReportRow[], range: RangeOption, total: { p1: number; p2: number; p3: number }): string {
  const rangeLabel = range === "hoy" ? "Hoy" : range === "semana" ? "Últimos 7 días" : range === "mes" ? "Últimos 30 días" : "Todos los reportes";
  const now = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });

  const rows = reports.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8f9fa" : "white"}">
      <td style="padding:8px;font-size:12px;color:#666">${i + 1}</td>
      <td style="padding:8px">
        <span style="background:${priorityColor(r.priority)}22;color:${priorityColor(r.priority)};border:1px solid ${priorityColor(r.priority)};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold">${r.priority}</span>
      </td>
      <td style="padding:8px;font-size:12px">${r.type === "panic" ? "🚨 Pánico" : (r.categoryLabel || "Reporte")}</td>
      <td style="padding:8px;font-size:12px;max-width:200px">${r.text || "—"}</td>
      <td style="padding:8px;font-size:12px">${r.zone || "—"}</td>
      <td style="padding:8px;font-size:12px">${r.authorName || "—"}</td>
      <td style="padding:8px;font-size:11px;color:#666">${statusLabel(r.status)}</td>
      <td style="padding:8px;font-size:11px;color:#666;white-space:nowrap">${formatDate(r.createdAt)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    h1 { color: #C53030; margin: 0; font-size: 22px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #C53030; padding-bottom: 12px; }
    .logo { font-size: 28px; font-weight: 900; color: #C53030; }
    .subtitle { color: #666; font-size: 13px; margin-top: 4px; }
    .stats { display: flex; gap: 16px; margin-bottom: 20px; }
    .stat { flex: 1; padding: 12px; border-radius: 8px; text-align: center; }
    .stat-num { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #C53030; color: white; padding: 10px 8px; text-align: left; font-size: 12px; }
    tr:hover { background: #fff5f5; }
    .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🛡 WILLAY</div>
      <div class="subtitle">Serenazgo Puente Piedra — Reporte de Incidencias</div>
      <div class="subtitle"><strong>Período:</strong> ${rangeLabel} &nbsp;|&nbsp; <strong>Fecha:</strong> ${now}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;color:#666">Total de incidencias</div>
      <div style="font-size:32px;font-weight:900;color:#C53030">${reports.length}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat" style="background:#FFF5F5;border:1px solid #FEB2B2">
      <div class="stat-num" style="color:#C53030">${total.p1}</div>
      <div class="stat-label">P1 — Crítico</div>
    </div>
    <div class="stat" style="background:#FFFAF0;border:1px solid #FBD38D">
      <div class="stat-num" style="color:#DD6B20">${total.p2}</div>
      <div class="stat-label">P2 — Moderado</div>
    </div>
    <div class="stat" style="background:#EBF8FF;border:1px solid #90CDF4">
      <div class="stat-num" style="color:#3182CE">${total.p3}</div>
      <div class="stat-label">P3 — Menor</div>
    </div>
    <div class="stat" style="background:#F0FFF4;border:1px solid #9AE6B4">
      <div class="stat-num" style="color:#276749">${reports.filter(r => r.status === "closed").length}</div>
      <div class="stat-label">Resueltos</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Prioridad</th>
        <th>Tipo</th>
        <th>Descripción</th>
        <th>Zona</th>
        <th>Vecino</th>
        <th>Estado</th>
        <th>Fecha/Hora</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    Generado por WILLAY — Sistema de Seguridad Ciudadana de Puente Piedra &nbsp;|&nbsp; ${new Date().toLocaleString("es-PE")}
  </div>
</body>
</html>`;
}

export default function ExportPDF() {
  const router = useRouter();
  const { user } = useAuthUser();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const [range,     setRange]     = useState<RangeOption>("hoy");
  const [reports,   setReports]   = useState<ReportRow[]>([]);
  const [fetching,  setFetching]  = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [range]);

  async function fetchReports() {
    setFetching(true);
    try {
      const db = getDb();
      const rangeStart = getRangeStart(range);
      const snap = await getDocs(
        rangeStart
          ? query(
              collection(db, "reports"),
              where("createdAt", ">=", Timestamp.fromDate(rangeStart)),
              orderBy("createdAt", "desc")
            )
          : query(collection(db, "reports"), orderBy("createdAt", "desc"))
      );

      // Si no hay resultados con filtro, cargar todos
      if (snap.empty && rangeStart) {
        const allSnap = await getDocs(
          query(collection(db, "reports"), orderBy("createdAt", "desc"))
        );
        const rows = allSnap.docs.map((d) => {
          const data = d.data();
          const createdAt = data.createdAt;
          // Filtrar manualmente por fecha
          if (rangeStart && createdAt?.toDate) {
            if (createdAt.toDate() < rangeStart) return null;
          }
          return {
            id: d.id,
            priority: data.priority ?? "P3",
            status: data.status ?? "received",
            type: data.type ?? "text",
            categoryLabel: data.categoryLabel ?? "",
            text: data.text ?? "",
            zone: data.zone ?? "",
            authorName: data.authorName ?? "",
            createdAt: data.createdAt,
          } as ReportRow;
        }).filter(Boolean) as ReportRow[];
        setReports(rows);
        return;
      }

      const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          priority: data.priority ?? "P3",
          status: data.status ?? "received",
          type: data.type ?? "text",
          categoryLabel: data.categoryLabel ?? "",
          text: data.text ?? "",
          zone: data.zone ?? "",
          authorName: data.authorName ?? "",
          createdAt: data.createdAt,
        } as ReportRow;
      });
      setReports(rows);
    } catch (e) {
      // Si falla el query con índice, cargar sin ordenar
      try {
        const db = getDb();
        const snap = await getDocs(collection(db, "reports"));
        const rows = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            priority: data.priority ?? "P3",
            status: data.status ?? "received",
            type: data.type ?? "text",
            categoryLabel: data.categoryLabel ?? "",
            text: data.text ?? "",
            zone: data.zone ?? "",
            authorName: data.authorName ?? "",
            createdAt: data.createdAt,
          } as ReportRow;
        });
        setReports(rows);
      } catch {
        Alert.alert("Error", "No se pudieron cargar los reportes.");
      }
    } finally {
      setFetching(false);
    }
  }

  async function exportPDF() {
    if (reports.length === 0) {
      Alert.alert("Sin datos", "No hay reportes en el rango seleccionado.");
      return;
    }
    setExporting(true);
    try {
      const total = {
        p1: reports.filter((r) => r.priority === "P1").length,
        p2: reports.filter((r) => r.priority === "P2").length,
        p3: reports.filter((r) => r.priority === "P3").length,
      };
      const html = generateHTML(reports, range, total);
      const Print = require("expo-print");
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Share.share({ url: uri, title: `Willay_Reporte_${range}.pdf` });
    } catch (e) {
      Alert.alert("Error", "No se pudo generar el PDF. " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const p1 = reports.filter((r) => r.priority === "P1").length;
  const p2 = reports.filter((r) => r.priority === "P2").length;
  const p3 = reports.filter((r) => r.priority === "P3").length;
  const closed = reports.filter((r) => r.status === "closed").length;

  const RANGES: { key: RangeOption; label: string; icon: string }[] = [
    { key: "hoy",    label: "Hoy",          icon: "today" },
    { key: "semana", label: "Última semana", icon: "calendar" },
    { key: "mes",    label: "Último mes",    icon: "calendar-outline" },
    { key: "todo",   label: "Todo",          icon: "infinite" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Exportar Reporte</Text>
          <Text style={styles.subtitle}>PDF de incidencias</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Selector de rango */}
        <Text style={styles.sectionLabel}>PERÍODO</Text>
        <View style={styles.rangeGrid}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeBtn, range === r.key && { backgroundColor: colors.brand, borderColor: colors.brand }]}
              onPress={() => setRange(r.key)}
            >
              <Ionicons name={r.icon as any} size={18} color={range === r.key ? "white" : colors.textMuted} />
              <Text style={[styles.rangeTxt, range === r.key && { color: "white" }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview de estadísticas */}
        <Text style={styles.sectionLabel}>RESUMEN</Text>
        {fetching ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={styles.loadingTxt}>Cargando reportes...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderColor: colors.danger }]}>
                <Text style={[styles.statNum, { color: colors.danger }]}>{p1}</Text>
                <Text style={styles.statLabel}>P1 Crítico</Text>
              </View>
              <View style={[styles.statCard, { borderColor: colors.warning }]}>
                <Text style={[styles.statNum, { color: colors.warning }]}>{p2}</Text>
                <Text style={styles.statLabel}>P2 Moderado</Text>
              </View>
              <View style={[styles.statCard, { borderColor: "#3DA5D9" }]}>
                <Text style={[styles.statNum, { color: "#3DA5D9" }]}>{p3}</Text>
                <Text style={styles.statLabel}>P3 Menor</Text>
              </View>
              <View style={[styles.statCard, { borderColor: colors.success }]}>
                <Text style={[styles.statNum, { color: colors.success }]}>{closed}</Text>
                <Text style={styles.statLabel}>Resueltos</Text>
              </View>
            </View>

            <View style={styles.totalCard}>
              <Ionicons name="document-text" size={24} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.totalNum}>{reports.length} incidencias</Text>
                <Text style={styles.totalLabel}>se incluirán en el PDF</Text>
              </View>
            </View>

            {/* Preview de los primeros reportes */}
            {reports.slice(0, 5).map((r, i) => (
              <View key={r.id} style={[styles.previewRow, { borderLeftColor: priorityColor(r.priority) }]}>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor(r.priority) }]}>
                  <Text style={styles.priorityDotTxt}>{r.priority}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewType}>{r.type === "panic" ? "Alerta de Pánico" : (r.categoryLabel || "Reporte")}</Text>
                  <Text style={styles.previewText} numberOfLines={1}>{r.text || "Sin descripción"}</Text>
                  <Text style={styles.previewMeta}>{r.zone} · {formatDate(r.createdAt)}</Text>
                </View>
              </View>
            ))}
            {reports.length > 5 && (
              <Text style={styles.moreText}>... y {reports.length - 5} reportes más en el PDF</Text>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Botón exportar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.exportBtn, (exporting || fetching || reports.length === 0) && { opacity: 0.5 }]}
          onPress={exportPDF}
          disabled={exporting || fetching || reports.length === 0}
          activeOpacity={0.85}
        >
          {exporting ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.exportTxt}>Generando PDF...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Ionicons name="document-text" size={20} color="white" />
              <Text style={styles.exportTxt}>Exportar PDF ({reports.length} reportes)</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg, alignItems: "center", justifyContent: "center",
  },
  title:    { color: colors.text, fontSize: 20, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 12 },

  scroll: { padding: 16, gap: 8 },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: "700",
    letterSpacing: 1, marginTop: 12, marginBottom: 8,
  },

  rangeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rangeBtn: {
    flexBasis: "47%", flexGrow: 1,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  rangeTxt: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },

  loadingWrap: { alignItems: "center", padding: 32, gap: 12 },
  loadingTxt:  { color: colors.textMuted, fontSize: 14 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1,
    padding: 10, alignItems: "center", gap: 2,
  },
  statNum:   { fontSize: 22, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 10, textAlign: "center" },

  totalCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.brand + "11",
    borderWidth: 1, borderColor: colors.brand + "44",
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  totalNum:   { color: colors.text, fontSize: 16, fontWeight: "800" },
  totalLabel: { color: colors.textMuted, fontSize: 12 },

  previewRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, padding: 12, marginBottom: 6,
  },
  priorityDot: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  priorityDotTxt: { color: "white", fontSize: 11, fontWeight: "800" },
  previewType:    { color: colors.text, fontSize: 13, fontWeight: "700" },
  previewText:    { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  previewMeta:    { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  moreText:       { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 4 },

  footer: {
    padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  exportBtn: {
    backgroundColor: colors.brand, borderRadius: 16,
    paddingVertical: 18, alignItems: "center", justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  exportTxt: { color: "white", fontSize: 16, fontWeight: "800" },
});