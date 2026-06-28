import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../lib/firebase";

interface Report {
  id: string; priority: string; status: string; type: string;
  categoryLabel: string; text: string; zone: string;
  authorName: string; createdAt: any;
  location?: { latitude: number; longitude: number };
}

function pColor(p: string) {
  if (p === "P1") return "#EF4444";
  if (p === "P2") return "#F97316";
  return "#3B82F6";
}
function sLabel(s: string) {
  if (s === "received")  return "Recibido";
  if (s === "attending") return "En atención";
  if (s === "closed")    return "Cerrado";
  if (s === "dismissed") return "Descartado";
  return s;
}
function sColor(s: string) {
  if (s === "closed")    return "#10B981";
  if (s === "attending") return "#3B82F6";
  if (s === "dismissed") return "#6B7280";
  return "#F59E0B";
}
function formatDate(ts: any) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function toInputDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function generatePDF(reports: Report[], dateFrom: string, dateTo: string) {
  const now = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });
  const p1 = reports.filter(r=>r.priority==="P1").length;
  const p2 = reports.filter(r=>r.priority==="P2").length;
  const p3 = reports.filter(r=>r.priority==="P3").length;
  const closed = reports.filter(r=>r.status==="closed").length;

  const rows = reports.map((r,i) => `
    <tr style="background:${i%2===0?"#f8f9fa":"white"}">
      <td style="padding:8px;font-size:12px;color:#666">${i+1}</td>
      <td style="padding:8px"><span style="background:${pColor(r.priority)}22;color:${pColor(r.priority)};border:1px solid ${pColor(r.priority)}44;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold">${r.priority}</span></td>
      <td style="padding:8px;font-size:12px">${r.type==="panic"?"🚨 Pánico":(r.categoryLabel||"Reporte")}</td>
      <td style="padding:8px;font-size:12px;max-width:180px">${r.text||"—"}</td>
      <td style="padding:8px;font-size:12px">${r.zone||"—"}</td>
      <td style="padding:8px;font-size:12px">${r.authorName||"—"}</td>
      <td style="padding:8px"><span style="background:${sColor(r.status)}22;color:${sColor(r.status)};padding:2px 8px;border-radius:4px;font-size:11px">${sLabel(r.status)}</span></td>
      <td style="padding:8px;font-size:11px;color:#666;white-space:nowrap">${formatDate(r.createdAt)}</td>
      <td style="padding:8px;font-size:11px;color:#10B981">${r.location?.latitude ? `${r.location.latitude.toFixed(5)}, ${r.location.longitude.toFixed(5)}` : "—"}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Willay — Reporte</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:24px;color:#333}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:3px solid #E53E3E;padding-bottom:16px}
  .logo{font-size:30px;font-weight:900;color:#E53E3E;letter-spacing:2px}.subtitle{color:#666;font-size:13px;margin-top:4px}
  .stats{display:flex;gap:16px;margin-bottom:20px}.stat{flex:1;padding:14px;border-radius:8px;text-align:center}
  .stat-num{font-size:30px;font-weight:bold}.stat-label{font-size:11px;color:#666;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:12px}th{background:#E53E3E;color:white;padding:10px 8px;text-align:left;font-size:11px}
  tr:hover{background:#fff5f5}.footer{margin-top:20px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:10px}
  @media print{body{padding:12px}}</style></head><body>
  <div class="header"><div><div class="logo">🛡 WILLAY</div>
  <div class="subtitle">Torre de Control — Serenazgo Puente Piedra</div>
  <div class="subtitle"><strong>Período:</strong> ${dateFrom} al ${dateTo} &nbsp;|&nbsp; <strong>Generado:</strong> ${now}</div></div>
  <div style="text-align:right"><div style="font-size:13px;color:#666">Total incidencias</div>
  <div style="font-size:40px;font-weight:900;color:#E53E3E">${reports.length}</div></div></div>
  <div class="stats">
    <div class="stat" style="background:#FFF5F5;border:1px solid #FEB2B2"><div class="stat-num" style="color:#C53030">${p1}</div><div class="stat-label">P1 — Crítico</div></div>
    <div class="stat" style="background:#FFFAF0;border:1px solid #FBD38D"><div class="stat-num" style="color:#DD6B20">${p2}</div><div class="stat-label">P2 — Moderado</div></div>
    <div class="stat" style="background:#EBF8FF;border:1px solid #90CDF4"><div class="stat-num" style="color:#3182CE">${p3}</div><div class="stat-label">P3 — Menor</div></div>
    <div class="stat" style="background:#F0FFF4;border:1px solid #9AE6B4"><div class="stat-num" style="color:#276749">${closed}</div><div class="stat-label">Resueltos</div></div>
  </div>
  <table><thead><tr><th>#</th><th>Prioridad</th><th>Tipo</th><th>Descripción</th><th>Zona</th><th>Vecino</th><th>Estado</th><th>Fecha/Hora</th><th>GPS</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="footer">Sistema WILLAY — Seguridad Ciudadana Puente Piedra &nbsp;|&nbsp; ${now}</div>
  <script>window.onload = () => window.print();</script></body></html>`;

  const blob = new Blob([html], { type:"text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.focus();
}

function generateExcel(reports: Report[], dateFrom: string, dateTo: string) {
  const data = reports.map((r, i) => ({
    "#":           i + 1,
    "Prioridad":   r.priority,
    "Tipo":        r.type === "panic" ? "Alerta de Pánico" : (r.categoryLabel || "Reporte"),
    "Descripción": r.text || "—",
    "Zona":        r.zone || "—",
    "Vecino":      r.authorName || "—",
    "Estado":      sLabel(r.status),
    "Fecha/Hora":  formatDate(r.createdAt),
    "Latitud":     r.location?.latitude || "—",
    "Longitud":    r.location?.longitude || "—",
  }));

  // Hoja de resumen
  const resumen = [
    ["WILLAY — Reporte de Incidencias", "", "", ""],
    ["Serenazgo Puente Piedra", "", "", ""],
    [`Período: ${dateFrom} al ${dateTo}`, "", "", ""],
    [`Generado: ${new Date().toLocaleString("es-PE")}`, "", "", ""],
    ["", "", "", ""],
    ["RESUMEN", "", "", ""],
    ["Total reportes", reports.length, "", ""],
    ["P1 Críticos",   reports.filter(r=>r.priority==="P1").length, "", ""],
    ["P2 Moderados",  reports.filter(r=>r.priority==="P2").length, "", ""],
    ["P3 Menores",    reports.filter(r=>r.priority==="P3").length, "", ""],
    ["Resueltos",     reports.filter(r=>r.status==="closed").length, "", ""],
    ["Activos",       reports.filter(r=>r.status!=="closed"&&r.status!=="dismissed").length, "", ""],
  ];

  const wb = XLSX.utils.book_new();

  // Hoja resumen
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  // Hoja detalle
  const wsDetalle = XLSX.utils.json_to_sheet(data);
  wsDetalle["!cols"] = [
    { wch: 5 }, { wch: 10 }, { wch: 20 }, { wch: 40 },
    { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
    { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Reportes");

  XLSX.writeFile(wb, `Willay_Reportes_${dateFrom}_${dateTo}.xlsx`);
}

export default function Reports() {
  const [reports,    setReports]    = useState<Report[]>([]);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<Report | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting,  setExporting]  = useState(false);

  const todayStr = toInputDate(new Date());
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo,   setDateTo]   = useState(todayStr);

  useEffect(() => {
    return onSnapshot(collection(db, "reports"), snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)).reverse());
    });
  }, []);

  const filtered = reports.filter(r => {
    if (filter !== "all" && r.priority !== filter) return false;
    if (search && !r.text?.toLowerCase().includes(search.toLowerCase()) &&
        !r.authorName?.toLowerCase().includes(search.toLowerCase()) &&
        !r.zone?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const forExport = reports.filter(r => {
    if (!r.createdAt?.toDate) return false;
    const d    = r.createdAt.toDate();
    const from = new Date(dateFrom + "T00:00:00");
    const to   = new Date(dateTo   + "T23:59:59");
    return d >= from && d <= to;
  });

  async function changeStatus(id: string, status: string) {
    await updateDoc(doc(db, "reports", id), { status });
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  function handleExportPDF() {
    if (forExport.length === 0) return;
    setExporting(true);
    generatePDF(forExport, dateFrom, dateTo);
    setTimeout(() => setExporting(false), 1000);
  }

  function handleExportExcel() {
    if (forExport.length === 0) return;
    setExporting(true);
    try { generateExcel(forExport, dateFrom, dateTo); }
    finally { setTimeout(() => setExporting(false), 1000); }
  }

  const hasLocation = selected?.location?.latitude && selected?.location?.longitude;

  return (
    <div style={{ display:"flex", gap:20, height:"calc(100vh - 64px)" }}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h1 style={{ color:"#F9FAFB", fontSize:28, fontWeight:900, margin:0 }}>Reportes</h1>
            <p style={{ color:"#6B7280", fontSize:13, margin:"4px 0 0" }}>{reports.length} total · {filtered.length} mostrando</p>
          </div>
          <button onClick={() => setShowExport(v => !v)} style={{
            display:"flex", alignItems:"center", gap:8,
            background: showExport ? "#6366F133" : "#6366F122",
            border:`1px solid ${showExport?"#6366F1":"#6366F144"}`,
            borderRadius:10, padding:"10px 18px", color:"#6366F1",
            cursor:"pointer", fontWeight:700, fontSize:13,
          }}>
            ⬇️ Exportar datos
          </button>
        </div>

        {/* Panel exportar */}
        {showExport && (
          <div style={{ background:"#161b22", border:"1px solid #6366F144", borderRadius:14, padding:20 }}>
            <div style={{ color:"#F9FAFB", fontSize:14, fontWeight:700, marginBottom:14 }}>⬇️ Exportar reportes</div>
            <div style={{ display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap", marginBottom:12 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:"#6B7280", fontSize:11, fontWeight:600 }}>FECHA DESDE</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ background:"#0d1117", border:"1px solid #30363d", borderRadius:8, padding:"10px 14px", color:"#F9FAFB", fontSize:14, cursor:"pointer" }} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:"#6B7280", fontSize:11, fontWeight:600 }}>FECHA HASTA</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ background:"#0d1117", border:"1px solid #30363d", borderRadius:8, padding:"10px 14px", color:"#F9FAFB", fontSize:14, cursor:"pointer" }} />
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[
                  { label:"Hoy",      fn: () => { setDateFrom(todayStr); setDateTo(todayStr); } },
                  { label:"7 días",   fn: () => { const d=new Date(); d.setDate(d.getDate()-7); setDateFrom(toInputDate(d)); setDateTo(todayStr); } },
                  { label:"30 días",  fn: () => { const d=new Date(); d.setDate(d.getDate()-30); setDateFrom(toInputDate(d)); setDateTo(todayStr); } },
                  { label:"Este mes", fn: () => { const d=new Date(); d.setDate(1); setDateFrom(toInputDate(d)); setDateTo(todayStr); } },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.fn} style={{ background:"#21262d", border:"1px solid #30363d", borderRadius:8, padding:"8px 12px", color:"#9CA3AF", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {forExport.length > 0 && (
              <div style={{ color:"#10B981", fontSize:12, marginBottom:12 }}>
                ✅ {forExport.length} reporte(s) en el intervalo seleccionado
              </div>
            )}
            {forExport.length === 0 && (
              <div style={{ color:"#EF4444", fontSize:12, marginBottom:12 }}>
                ⚠️ No hay reportes en ese intervalo
              </div>
            )}

            {/* Botones exportar */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handleExportPDF} disabled={exporting||forExport.length===0} style={{
                flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                background: forExport.length===0 ? "#21262d" : "#EF444422",
                border:`1px solid ${forExport.length===0?"#30363d":"#EF444444"}`,
                borderRadius:10, padding:"12px 20px",
                color: forExport.length===0 ? "#6B7280" : "#EF4444",
                cursor: forExport.length===0 ? "not-allowed" : "pointer",
                fontWeight:800, fontSize:14,
              }}>
                📄 Exportar PDF
              </button>
              <button onClick={handleExportExcel} disabled={exporting||forExport.length===0} style={{
                flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                background: forExport.length===0 ? "#21262d" : "#10B98122",
                border:`1px solid ${forExport.length===0?"#30363d":"#10B98144"}`,
                borderRadius:10, padding:"12px 20px",
                color: forExport.length===0 ? "#6B7280" : "#10B981",
                cursor: forExport.length===0 ? "not-allowed" : "pointer",
                fontWeight:800, fontSize:14,
              }}>
                📊 Exportar Excel
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:10, padding:"10px 14px", color:"#F9FAFB", fontSize:14, flex:1, outline:"none" }}
            placeholder="Buscar por texto, vecino o zona..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {["all","P1","P2","P3"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"10px 14px", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13,
              background: filter===f ? `${f==="all"?"#6366F1":pColor(f)}22` : "#161b22",
              border: filter===f ? `1px solid ${f==="all"?"#6366F1":pColor(f)}88` : "1px solid #21262d",
              color: filter===f ? (f==="all"?"#6366F1":pColor(f)) : "#6B7280",
            }}>{f==="all"?"Todos":f}</button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(r => {
            const pc = pColor(r.priority);
            const isSelected = selected?.id === r.id;
            const hasLoc = r.location?.latitude && r.location?.longitude;
            return (
              <div key={r.id} onClick={() => setSelected(r)} style={{
                background: isSelected ? "#1c2333" : "#161b22",
                border: `1px solid ${isSelected ? pc+"88" : "#21262d"}`,
                borderLeft: `4px solid ${pc}`, borderRadius:12, padding:"14px 16px", cursor:"pointer",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:800, background:`${pc}22`, color:pc, border:`1px solid ${pc}44` }}>{r.priority}</span>
                  <span style={{ color:"#E5E7EB", fontSize:13, fontWeight:600 }}>{r.type==="panic"?"🚨 Pánico":r.categoryLabel||"Reporte"}</span>
                  {hasLoc && <span style={{ color:"#10B981", fontSize:11 }}>📍 GPS</span>}
                  <span style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600, background:`${sColor(r.status)}22`, color:sColor(r.status) }}>{sLabel(r.status)}</span>
                </div>
                <div style={{ color:"#9CA3AF", fontSize:12, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.text||"Sin descripción"}</div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ color:"#6B7280", fontSize:11 }}>👤 {r.authorName||"—"}</span>
                  <span style={{ color:"#6B7280", fontSize:11 }}>📍 {r.zone||"—"}</span>
                  <span style={{ color:"#6B7280", fontSize:11 }}>{formatDate(r.createdAt)}</span>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && <div style={{ textAlign:"center", color:"#6B7280", padding:48 }}>Sin reportes</div>}
        </div>
      </div>

      {/* Detalle */}
      <div style={{ width:380, background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24, display:"flex", flexDirection:"column", gap:16, flexShrink:0, overflow:"auto" }}>
        {selected ? (
          <>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <span style={{ padding:"4px 14px", borderRadius:8, fontSize:13, fontWeight:800, background:`${pColor(selected.priority)}22`, color:pColor(selected.priority), border:`1px solid ${pColor(selected.priority)}44` }}>{selected.priority}</span>
                <span style={{ padding:"4px 12px", borderRadius:8, fontSize:12, fontWeight:600, background:`${sColor(selected.status)}22`, color:sColor(selected.status) }}>{sLabel(selected.status)}</span>
              </div>
              <h2 style={{ color:"#F9FAFB", fontSize:18, fontWeight:800, margin:"0 0 8px" }}>{selected.type==="panic"?"🚨 Alerta de Pánico":selected.categoryLabel||"Reporte"}</h2>
              <p style={{ color:"#9CA3AF", fontSize:14, lineHeight:1.6, margin:0 }}>{selected.text||"Sin descripción"}</p>
            </div>

            <div style={{ background:"#0d1117", borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { label:"Vecino", value: selected.authorName||"—" },
                { label:"Zona",   value: selected.zone||"—" },
                { label:"Tipo",   value: selected.type==="panic"?"Pánico":"Texto" },
                { label:"Fecha",  value: formatDate(selected.createdAt) },
              ].map(item => (
                <div key={item.label} style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#6B7280", fontSize:13 }}>{item.label}</span>
                  <span style={{ color:"#E5E7EB", fontSize:13, fontWeight:600 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Ubicación GPS</div>
              {hasLocation ? (
                <>
                  <div style={{ background:"#0d1117", borderRadius:10, padding:12, marginBottom:10 }}>
                    <div style={{ color:"#10B981", fontSize:13, fontWeight:600 }}>🌐 {selected.location!.latitude.toFixed(6)}, {selected.location!.longitude.toFixed(6)}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <button onClick={() => window.open(`https://www.google.com/maps?q=${selected.location!.latitude},${selected.location!.longitude}&z=17`,"_blank")} style={{ background:"#1e3a5f", border:"1px solid #3B82F644", borderRadius:10, padding:"12px", color:"#3B82F6", cursor:"pointer", fontSize:13, fontWeight:700 }}>🗺️ Ver en Google Maps</button>
                    <button onClick={() => window.open(`https://www.google.com/maps?q=&layer=c&cbll=${selected.location!.latitude},${selected.location!.longitude}`,"_blank")} style={{ background:"#1e3a2f", border:"1px solid #10B98144", borderRadius:10, padding:"12px", color:"#10B981", cursor:"pointer", fontSize:13, fontWeight:700 }}>📷 Street View</button>
                  </div>
                </>
              ) : (
                <div style={{ background:"#0d1117", borderRadius:10, padding:14, textAlign:"center", color:"#4B5563", fontSize:13 }}>Sin ubicación GPS</div>
              )}
            </div>

            <div>
              <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Cambiar estado</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { status:"attending", label:"En atención",    color:"#3B82F6" },
                  { status:"closed",    label:"Cerrar reporte", color:"#10B981" },
                  { status:"dismissed", label:"Descartar",      color:"#6B7280" },
                ].map(btn => (
                  <button key={btn.status} onClick={() => changeStatus(selected.id, btn.status)} disabled={selected.status===btn.status} style={{
                    background: selected.status===btn.status ? `${btn.color}22` : "transparent",
                    border:`1px solid ${btn.color}44`, borderRadius:10, padding:"10px 16px",
                    cursor: selected.status===btn.status ? "default" : "pointer",
                    color: btn.color, fontSize:13, fontWeight:600,
                    opacity: selected.status===btn.status ? 0.5 : 1,
                  }}>{btn.label}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#6B7280", gap:12 }}>
            <div style={{ fontSize:48 }}>📋</div>
            <div style={{ fontSize:14, textAlign:"center" }}>Selecciona un reporte para ver el detalle</div>
          </div>
        )}
      </div>
    </div>
  );
}