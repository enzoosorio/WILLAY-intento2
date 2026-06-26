import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
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

export default function Reports() {
  const [reports,  setReports]  = useState<Report[]>([]);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Report | null>(null);

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

  async function changeStatus(id: string, status: string) {
    await updateDoc(doc(db, "reports", id), { status });
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  const hasLocation = selected?.location?.latitude && selected?.location?.longitude;

  function openMaps() {
    if (!hasLocation) return;
    window.open(`https://www.google.com/maps?q=${selected!.location!.latitude},${selected!.location!.longitude}&z=17`, "_blank");
  }

  function openStreetView() {
    if (!hasLocation) return;
    window.open(`https://www.google.com/maps?q=&layer=c&cbll=${selected!.location!.latitude},${selected!.location!.longitude}`, "_blank");
  }

  return (
    <div style={{ display:"flex", gap:20, height:"calc(100vh - 64px)" }}>

      {/* Lista */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:16, minWidth:0 }}>
        <div>
          <h1 style={{ color:"#F9FAFB", fontSize:28, fontWeight:900, margin:0 }}>Reportes</h1>
          <p style={{ color:"#6B7280", fontSize:13, margin:"4px 0 0" }}>{reports.length} total · {filtered.length} mostrando</p>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <input
            style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:10, padding:"10px 14px", color:"#F9FAFB", fontSize:14, flex:1, outline:"none" }}
            placeholder="Buscar por texto, vecino o zona..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {["all","P1","P2","P3"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"10px 16px", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13,
              background: filter===f ? `${f==="all"?"#6366F1":pColor(f)}22` : "#161b22",
              border: filter===f ? `1px solid ${f==="all"?"#6366F1":pColor(f)}88` : "1px solid #21262d",
              color: filter===f ? (f==="all"?"#6366F1":pColor(f)) : "#6B7280",
            }}>{f==="all"?"Todos":f}</button>
          ))}
        </div>

        <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(r => {
            const pc = pColor(r.priority);
            const isSelected = selected?.id === r.id;
            const hasLoc = r.location?.latitude && r.location?.longitude;
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  background: isSelected ? "#1c2333" : "#161b22",
                  border: `1px solid ${isSelected ? pc+"88" : "#21262d"}`,
                  borderLeft: `4px solid ${pc}`,
                  borderRadius:12, padding:"14px 16px",
                  cursor:"pointer", transition:"all 0.15s",
                }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:800, background:`${pc}22`, color:pc, border:`1px solid ${pc}44` }}>
                    {r.priority}
                  </span>
                  <span style={{ color:"#E5E7EB", fontSize:13, fontWeight:600 }}>
                    {r.type==="panic" ? "🚨 Alerta de Pánico" : r.categoryLabel||"Reporte"}
                  </span>
                  {hasLoc && <span style={{ color:"#10B981", fontSize:11 }}>📍 GPS</span>}
                  <span style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600, background:`${sColor(r.status)}22`, color:sColor(r.status) }}>
                    {sLabel(r.status)}
                  </span>
                </div>
                <div style={{ color:"#9CA3AF", fontSize:12, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.text||"Sin descripción"}
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ color:"#6B7280", fontSize:11 }}>👤 {r.authorName||"—"}</span>
                  <span style={{ color:"#6B7280", fontSize:11 }}>📍 {r.zone||"—"}</span>
                  <span style={{ color:"#6B7280", fontSize:11 }}>{formatDate(r.createdAt)}</span>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && (
            <div style={{ textAlign:"center", color:"#6B7280", padding:48 }}>Sin reportes</div>
          )}
        </div>
      </div>

      {/* Detalle */}
      <div style={{ width:380, background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24, display:"flex", flexDirection:"column", gap:16, flexShrink:0, overflow:"auto" }}>
        {selected ? (
          <>
            {/* Header detalle */}
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <span style={{ padding:"4px 14px", borderRadius:8, fontSize:13, fontWeight:800, background:`${pColor(selected.priority)}22`, color:pColor(selected.priority), border:`1px solid ${pColor(selected.priority)}44` }}>
                  {selected.priority}
                </span>
                <span style={{ padding:"4px 12px", borderRadius:8, fontSize:12, fontWeight:600, background:`${sColor(selected.status)}22`, color:sColor(selected.status) }}>
                  {sLabel(selected.status)}
                </span>
              </div>
              <h2 style={{ color:"#F9FAFB", fontSize:18, fontWeight:800, margin:"0 0 8px" }}>
                {selected.type==="panic" ? "🚨 Alerta de Pánico" : selected.categoryLabel||"Reporte"}
              </h2>
              <p style={{ color:"#9CA3AF", fontSize:14, lineHeight:1.6, margin:0 }}>
                {selected.text||"Sin descripción"}
              </p>
            </div>

            {/* Info */}
            <div style={{ background:"#0d1117", borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { label:"Vecino",  value: selected.authorName||"—" },
                { label:"Zona",    value: selected.zone||"—" },
                { label:"Tipo",    value: selected.type==="panic"?"Pánico":"Texto" },
                { label:"Fecha",   value: formatDate(selected.createdAt) },
              ].map(item => (
                <div key={item.label} style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#6B7280", fontSize:13 }}>{item.label}</span>
                  <span style={{ color:"#E5E7EB", fontSize:13, fontWeight:600 }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Ubicación GPS */}
            <div>
              <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>
                Ubicación GPS
              </div>
              {hasLocation ? (
                <>
                  <div style={{ background:"#0d1117", borderRadius:10, padding:12, marginBottom:10 }}>
                    <div style={{ color:"#10B981", fontSize:13, fontWeight:600, marginBottom:2 }}>
                      🌐 {selected.location!.latitude.toFixed(6)}, {selected.location!.longitude.toFixed(6)}
                    </div>
                    <div style={{ color:"#6B7280", fontSize:11 }}>Coordenadas exactas del reporte</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <button onClick={openMaps} style={{
                      background:"#1e3a5f", border:"1px solid #3B82F644",
                      borderRadius:10, padding:"12px 16px", color:"#3B82F6",
                      cursor:"pointer", fontSize:13, fontWeight:700,
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    }}>
                      🗺️ Ver en Google Maps
                    </button>
                    <button onClick={openStreetView} style={{
                      background:"#1e3a2f", border:"1px solid #10B98144",
                      borderRadius:10, padding:"12px 16px", color:"#10B981",
                      cursor:"pointer", fontSize:13, fontWeight:700,
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    }}>
                      📷 Street View — Ver la calle
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ background:"#0d1117", borderRadius:10, padding:14, textAlign:"center", color:"#4B5563", fontSize:13 }}>
                  Sin ubicación GPS disponible
                </div>
              )}
            </div>

            {/* Cambiar estado */}
            <div>
              <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>
                Cambiar estado
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { status:"attending", label:"Marcar en atención", color:"#3B82F6" },
                  { status:"closed",    label:"Marcar como cerrado", color:"#10B981" },
                  { status:"dismissed", label:"Descartar reporte",   color:"#6B7280" },
                ].map(btn => (
                  <button
                    key={btn.status}
                    onClick={() => changeStatus(selected.id, btn.status)}
                    disabled={selected.status === btn.status}
                    style={{
                      background: selected.status===btn.status ? `${btn.color}22` : "transparent",
                      border:`1px solid ${btn.color}44`,
                      borderRadius:10, padding:"10px 16px", cursor: selected.status===btn.status ? "default" : "pointer",
                      color: btn.color, fontSize:13, fontWeight:600, opacity: selected.status===btn.status ? 0.5 : 1,
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#6B7280", gap:12 }}>
            <div style={{ fontSize:48 }}>📋</div>
            <div style={{ fontSize:14, textAlign:"center" }}>Selecciona un reporte para ver el detalle y su ubicación</div>
          </div>
        )}
      </div>
    </div>
  );
}