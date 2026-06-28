import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";

interface LogEntry { id: string; action: string; reportId: string; operatorName: string; oldStatus: string; newStatus: string; createdAt: any; priority?: string; }

function formatDate(ts: any) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function actionLabel(action: string) {
  if (action === "status_change") return "Cambio de estado";
  if (action === "report_created") return "Reporte creado";
  if (action === "report_closed")  return "Reporte cerrado";
  return action;
}

function statusColor(s: string) {
  if (s === "closed")    return "#10B981";
  if (s === "attending") return "#3B82F6";
  if (s === "dismissed") return "#6B7280";
  return "#F59E0B";
}

function statusLabel(s: string) {
  if (s === "received")  return "Recibido";
  if (s === "attending") return "En atención";
  if (s === "closed")    return "Cerrado";
  if (s === "dismissed") return "Descartado";
  return s || "—";
}

export default function History() {
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    const q = query(collection(db, "action_logs"), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry)));
    });
  }, []);

  const filtered = logs.filter(l => {
    if (filter !== "all" && l.action !== filter) return false;
    if (search && !l.operatorName?.toLowerCase().includes(search.toLowerCase()) &&
        !l.reportId?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h1 style={{ color:"#F9FAFB", fontSize:28, fontWeight:900, margin:0 }}>Historial de acciones</h1>
      <p style={{ color:"#6B7280", fontSize:13, margin:"4px 0 24px" }}>{logs.length} acciones registradas</p>

      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <input
          style={{ flex:1, background:"#161b22", border:"1px solid #21262d", borderRadius:10, padding:"10px 14px", color:"#F9FAFB", fontSize:14, outline:"none" }}
          placeholder="Buscar por operador o ID de reporte..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        {["all","status_change","report_created","report_closed"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:"10px 14px", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:12,
            background: filter===f ? "#EF444422" : "#161b22",
            border: filter===f ? "1px solid #EF444488" : "1px solid #21262d",
            color: filter===f ? "#EF4444" : "#6B7280",
          }}>
            {f==="all"?"Todos":f==="status_change"?"Cambios":f==="report_created"?"Creados":"Cerrados"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:48, textAlign:"center", color:"#6B7280" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div>Sin registros de acciones aún.</div>
          <div style={{ fontSize:12, marginTop:8 }}>Las acciones se registrarán automáticamente cuando los operadores cambien estados de reportes.</div>
        </div>
      ) : (
        <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid #21262d" }}>
                {["Fecha/Hora","Acción","Operador","Reporte","Estado anterior","Nuevo estado"].map(h => (
                  <th key={h} style={{ color:"#6B7280", fontSize:11, fontWeight:600, padding:"12px 16px", textAlign:"left", letterSpacing:1, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ borderBottom:"1px solid #0d1117" }}>
                  <td style={{ color:"#9CA3AF", fontSize:12, padding:"12px 16px", whiteSpace:"nowrap" }}>{formatDate(l.createdAt)}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, background:"#6366F122", color:"#6366F1" }}>
                      {actionLabel(l.action)}
                    </span>
                  </td>
                  <td style={{ color:"#E5E7EB", fontSize:13, padding:"12px 16px" }}>{l.operatorName||"—"}</td>
                  <td style={{ color:"#9CA3AF", fontSize:12, padding:"12px 16px", fontFamily:"monospace" }}>{l.reportId?.slice(0,8)||"—"}</td>
                  <td style={{ padding:"12px 16px" }}>
                    {l.oldStatus && <span style={{ padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:600, background:`${statusColor(l.oldStatus)}22`, color:statusColor(l.oldStatus) }}>{statusLabel(l.oldStatus)}</span>}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    {l.newStatus && <span style={{ padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:600, background:`${statusColor(l.newStatus)}22`, color:statusColor(l.newStatus) }}>{statusLabel(l.newStatus)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}