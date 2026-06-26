import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";

interface Report {
  id: string; priority: string; status: string; zone: string;
  type: string; categoryLabel: string; authorName: string; createdAt: any;
  location?: { latitude: number; longitude: number };
  text?: string;
}

const COLORS = { P1: "#EF4444", P2: "#F97316", P3: "#3B82F6", success: "#10B981", warning: "#F59E0B", muted: "#6B7280" };

function StatCard({ label, value, color, icon, sub }: { label: string; value: number; color: string; icon: string; sub?: string }) {
  return (
    <div style={{ background:"#0d1117", border:`1px solid ${color}33`, borderRadius:16, padding:"24px 20px", borderLeft:`4px solid ${color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ color:COLORS.muted, fontSize:12, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
          <div style={{ color, fontSize:42, fontWeight:900, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ color:COLORS.muted, fontSize:12, marginTop:6 }}>{sub}</div>}
        </div>
        <div style={{ fontSize:32, opacity:0.8 }}>{icon}</div>
      </div>
    </div>
  );
}

function AlertCard({ report, isNew }: { report: Report; isNew: boolean }) {
  const pc = report.priority === "P1" ? COLORS.P1 : report.priority === "P2" ? COLORS.P2 : COLORS.P3;
  const hasLocation = report.location?.latitude && report.location?.longitude;

  function openInMaps() {
    if (!hasLocation) return;
    const url = `https://www.google.com/maps?q=${report.location!.latitude},${report.location!.longitude}&z=17`;
    window.open(url, "_blank");
  }

  function openInStreetView() {
    if (!hasLocation) return;
    const url = `https://www.google.com/maps?q=&layer=c&cbll=${report.location!.latitude},${report.location!.longitude}`;
    window.open(url, "_blank");
  }

  return (
    <div style={{
      background: isNew ? `${pc}11` : "#0d1117",
      border: `1px solid ${isNew ? pc : "#21262d"}`,
      borderLeft: `4px solid ${pc}`,
      borderRadius: 12, padding: "14px 16px",
      animation: isNew ? "fadeIn 0.5s ease" : "none",
      position: "relative",
    }}>
      {isNew && (
        <div style={{
          position: "absolute", top: -8, right: 12,
          background: pc, color: "white", fontSize: 10, fontWeight: 800,
          padding: "2px 8px", borderRadius: 999,
        }}>NUEVA</div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:800, background:`${pc}22`, color:pc, border:`1px solid ${pc}44` }}>
          {report.priority}
        </span>
        <span style={{ color:"#E5E7EB", fontSize:13, fontWeight:700 }}>
          {report.type === "panic" ? "🚨 Alerta de Pánico" : report.categoryLabel || "Reporte"}
        </span>
        <span style={{ marginLeft:"auto", color:"#6B7280", fontSize:11 }}>
          {report.status === "closed" ? "✅ Cerrado" : report.status === "attending" ? "🔵 En atención" : "🟡 Recibido"}
        </span>
      </div>

      {report.text && (
        <p style={{ color:"#9CA3AF", fontSize:12, margin:"0 0 8px" }}>{report.text}</p>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: hasLocation ? 10 : 0 }}>
        <span style={{ color:"#6B7280", fontSize:12 }}>👤 {report.authorName || "—"}</span>
        <span style={{ color:"#6B7280", fontSize:12 }}>📍 {report.zone || "—"}</span>
        {hasLocation && (
          <span style={{ color:"#10B981", fontSize:12 }}>
            🌐 {report.location!.latitude.toFixed(5)}, {report.location!.longitude.toFixed(5)}
          </span>
        )}
      </div>

      {hasLocation && (
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          <button onClick={openInMaps} style={{
            flex:1, background:"#1e3a5f", border:"1px solid #3B82F644",
            borderRadius:8, padding:"8px 12px", color:"#3B82F6",
            cursor:"pointer", fontSize:12, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            🗺️ Ver en Google Maps
          </button>
          <button onClick={openInStreetView} style={{
            flex:1, background:"#1e3a2f", border:"1px solid #10B98144",
            borderRadius:8, padding:"8px 12px", color:"#10B981",
            cursor:"pointer", fontSize:12, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            📷 Street View
          </button>
        </div>
      )}

      {!hasLocation && (
        <div style={{ color:"#4B5563", fontSize:11, marginTop:4 }}>
          Sin ubicación GPS disponible
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [reports,    setReports]    = useState<Report[]>([]);
  const [newAlerts,  setNewAlerts]  = useState<Set<string>>(new Set());
  const [now,        setNow]        = useState(new Date());
  const [dbStatus,   setDbStatus]   = useState<"connecting"|"ok"|"error">("connecting");
  const prevIdsRef = useRef<Set<string>>(new Set());
  const audioRef   = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return onSnapshot(
      collection(db, "reports"),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
        const currentIds = new Set(docs.map(d => d.id));

        // Detectar nuevas alertas
        const newIds = new Set<string>();
        currentIds.forEach(id => {
          if (!prevIdsRef.current.has(id) && prevIdsRef.current.size > 0) {
            newIds.add(id);
          }
        });

        if (newIds.size > 0) {
          setNewAlerts(prev => new Set([...prev, ...newIds]));
          // Quitar el badge de "NUEVA" después de 10 segundos
          setTimeout(() => {
            setNewAlerts(prev => {
              const next = new Set(prev);
              newIds.forEach(id => next.delete(id));
              return next;
            });
          }, 10000);
        }

        prevIdsRef.current = currentIds;
        setReports(docs);
        setDbStatus("ok");
      },
      error => {
        console.error("Error Firestore:", error.code, error.message);
        setDbStatus("error");
      }
    );
  }, []);

  const p1 = reports.filter(r => r.priority === "P1").length;
  const p2 = reports.filter(r => r.priority === "P2").length;
  const p3 = reports.filter(r => r.priority === "P3").length;
  const active   = reports.filter(r => r.status !== "closed" && r.status !== "dismissed").length;
  const resolved = reports.filter(r => r.status === "closed").length;
  const panic    = reports.filter(r => r.type === "panic").length;

  const byZone = Object.entries(
    reports.reduce((acc, r) => {
      const z = r.zone || "otros";
      acc[z] = (acc[z] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([zone, count]) => ({ zone, count })).sort((a,b) => b.count - a.count);

  const pieData = [
    { name: "P1", value: p1, color: COLORS.P1 },
    { name: "P2", value: p2, color: COLORS.P2 },
    { name: "P3", value: p3, color: COLORS.P3 },
  ].filter(d => d.value > 0);

  // Alertas recientes ordenadas por prioridad y tiempo
  const recentAlerts = [...reports]
    .sort((a, b) => {
      const pOrder = { P1: 0, P2: 1, P3: 2 };
      const pa = pOrder[a.priority as keyof typeof pOrder] ?? 3;
      const pb = pOrder[b.priority as keyof typeof pOrder] ?? 3;
      return pa - pb;
    })
    .slice(0, 6);

  return (
    <div style={{ minHeight:"100vh" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {dbStatus === "error" && (
        <div style={{ background:"#EF444422", border:"1px solid #EF4444", borderRadius:10, padding:"10px 16px", marginBottom:20, color:"#EF4444", fontSize:13 }}>
          ❌ Error conectando a la base de datos. Verifica tu conexión.
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
        <div>
          <div style={{ color:COLORS.muted, fontSize:12, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Torre de Control · En vivo</div>
          <h1 style={{ color:"#F9FAFB", fontSize:32, fontWeight:900, margin:0 }}>Dashboard Operacional</h1>
          <div style={{ color:COLORS.muted, fontSize:13, marginTop:4 }}>
            Puente Piedra, Lima · {now.toLocaleDateString("es-PE", { weekday:"long", day:"numeric", month:"long" })}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"#10B981", fontSize:28, fontWeight:900, fontFamily:"monospace" }}>
            {now.toLocaleTimeString("es-PE")}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end", marginTop:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background: dbStatus==="ok"?"#10B981":"#F59E0B" }} />
            <span style={{ color: dbStatus==="ok"?"#10B981":"#F59E0B", fontSize:12, fontWeight:600 }}>
              {dbStatus==="ok" ? "SISTEMA ACTIVO" : "CONECTANDO..."}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:16 }}>
        <StatCard label="Total reportes" value={reports.length} color="#6366F1" icon="📊" sub="Histórico total" />
        <StatCard label="P1 Críticos"    value={p1}             color={COLORS.P1} icon="🚨" sub="Atención inmediata" />
        <StatCard label="P2 Moderados"   value={p2}             color={COLORS.P2} icon="⚠️" sub="En seguimiento" />
        <StatCard label="P3 Menores"     value={p3}             color={COLORS.P3} icon="ℹ️" sub="Bajo riesgo" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:32 }}>
        <StatCard label="Activos ahora"  value={active}   color={COLORS.warning} icon="🔴" sub="Sin resolver" />
        <StatCard label="Resueltos"      value={resolved} color={COLORS.success} icon="✅" sub="Cerrados" />
        <StatCard label="Alertas pánico" value={panic}    color={COLORS.P1}      icon="🆘" sub="Botón de pánico" />
      </div>

      {/* Layout principal: alertas + gráficos */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:32 }}>

        {/* Alertas con ubicación */}
        <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700 }}>🚨 Alertas — Ubicación en tiempo real</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981" }} />
              <span style={{ color:"#10B981", fontSize:11 }}>En vivo</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:500, overflowY:"auto" }}>
            {recentAlerts.length === 0 ? (
              <div style={{ color:"#6B7280", textAlign:"center", padding:32 }}>
                {dbStatus === "connecting" ? "Cargando..." : "Sin alertas aún"}
              </div>
            ) : (
              recentAlerts.map(r => (
                <AlertCard key={r.id} report={r} isNew={newAlerts.has(r.id)} />
              ))
            )}
          </div>
        </div>

        {/* Gráficos */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24 }}>
            <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700, marginBottom:16 }}>Incidencias por zona</div>
            {byZone.length === 0 ? (
              <div style={{ color:"#6B7280", textAlign:"center", padding:24 }}>Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byZone} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="zone" tick={{ fill:"#6B7280", fontSize:10 }} />
                  <YAxis tick={{ fill:"#6B7280", fontSize:10 }} />
                  <Tooltip contentStyle={{ background:"#0d1117", border:"1px solid #30363d", color:"#F9FAFB", borderRadius:8 }} />
                  <Bar dataKey="count" fill="#EF4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24 }}>
            <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700, marginBottom:16 }}>Por prioridad</div>
            {pieData.length === 0 ? (
              <div style={{ color:"#6B7280", textAlign:"center", padding:24 }}>Sin datos</div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <ResponsiveContainer width="60%" height={150}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={3}>
                      {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:"#0d1117", border:"1px solid #30363d", color:"#F9FAFB", borderRadius:8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:d.color }} />
                        <span style={{ color:"#9CA3AF", fontSize:12 }}>{d.name}</span>
                      </div>
                      <span style={{ color:d.color, fontWeight:700, fontSize:14 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}