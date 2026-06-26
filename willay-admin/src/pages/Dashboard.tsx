import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

interface Report { id: string; priority: string; status: string; zone: string; type: string; categoryLabel: string; authorName: string; createdAt: any; }

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

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "reports"), snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    });
  }, []);

  const p1 = reports.filter(r => r.priority === "P1").length;
  const p2 = reports.filter(r => r.priority === "P2").length;
  const p3 = reports.filter(r => r.priority === "P3").length;
  const active   = reports.filter(r => r.status !== "closed" && r.status !== "dismissed").length;
  const resolved = reports.filter(r => r.status === "closed").length;
  const panic    = reports.filter(r => r.type === "panic").length;

  const byZone = Object.entries(
    reports.reduce((acc, r) => {
      const z = (r as any).zone || "otros";
      acc[z] = (acc[z] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([zone, count]) => ({ zone, count })).sort((a,b) => b.count - a.count);

  const pieData = [
    { name: "P1 Crítico",  value: p1, color: COLORS.P1 },
    { name: "P2 Moderado", value: p2, color: COLORS.P2 },
    { name: "P3 Menor",    value: p3, color: COLORS.P3 },
  ].filter(d => d.value > 0);

  const recentReports = [...reports].reverse().slice(0, 8);

  return (
    <div style={{ minHeight:"100vh" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
        <div>
          <div style={{ color:COLORS.muted, fontSize:12, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
            Torre de Control · En vivo
          </div>
          <h1 style={{ color:"#F9FAFB", fontSize:32, fontWeight:900, margin:0 }}>
            Dashboard Operacional
          </h1>
          <div style={{ color:COLORS.muted, fontSize:13, marginTop:4 }}>
            Puente Piedra, Lima · {now.toLocaleDateString("es-PE", { weekday:"long", day:"numeric", month:"long" })}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"#10B981", fontSize:28, fontWeight:900, fontFamily:"monospace" }}>
            {now.toLocaleTimeString("es-PE")}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end", marginTop:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 8px #10B981" }} />
            <span style={{ color:"#10B981", fontSize:12, fontWeight:600 }}>SISTEMA ACTIVO</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:32 }}>
        <StatCard label="Total reportes"  value={reports.length} color="#6366F1" icon="📊" sub="Histórico total" />
        <StatCard label="P1 Críticos"     value={p1}             color={COLORS.P1} icon="🚨" sub="Atención inmediata" />
        <StatCard label="P2 Moderados"    value={p2}             color={COLORS.P2} icon="⚠️" sub="En seguimiento" />
        <StatCard label="P3 Menores"      value={p3}             color={COLORS.P3} icon="ℹ️" sub="Bajo riesgo" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:32 }}>
        <StatCard label="Activos ahora"   value={active}   color={COLORS.warning} icon="🔴" sub="Sin resolver" />
        <StatCard label="Resueltos"       value={resolved} color={COLORS.success} icon="✅" sub="Cerrados" />
        <StatCard label="Alertas pánico"  value={panic}    color={COLORS.P1}      icon="🆘" sub="Botón de pánico" />
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:32 }}>
        <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24 }}>
          <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700, marginBottom:20 }}>Incidencias por zona</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byZone} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="zone" tick={{ fill:"#6B7280", fontSize:11 }} />
              <YAxis tick={{ fill:"#6B7280", fontSize:11 }} />
              <Tooltip contentStyle={{ background:"#0d1117", border:"1px solid #30363d", color:"#F9FAFB", borderRadius:8 }} />
              <Bar dataKey="count" fill="#EF4444" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24 }}>
          <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700, marginBottom:20 }}>Por prioridad</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={3}>
                {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background:"#0d1117", border:"1px solid #30363d", color:"#F9FAFB", borderRadius:8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:d.color }} />
                  <span style={{ color:"#9CA3AF", fontSize:12 }}>{d.name}</span>
                </div>
                <span style={{ color:d.color, fontWeight:700, fontSize:13 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent reports */}
      <div style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700 }}>Últimos reportes en tiempo real</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", animation:"pulse 2s infinite" }} />
            <span style={{ color:"#10B981", fontSize:12 }}>En vivo</span>
          </div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #21262d" }}>
              {["Prioridad","Tipo","Zona","Vecino","Estado"].map(h => (
                <th key={h} style={{ color:"#6B7280", fontSize:11, fontWeight:600, padding:"0 12px 12px", textAlign:"left", letterSpacing:1, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentReports.map(r => {
              const pc = r.priority==="P1"?COLORS.P1:r.priority==="P2"?COLORS.P2:COLORS.P3;
              return (
                <tr key={r.id} style={{ borderBottom:"1px solid #0d1117" }}>
                  <td style={{ padding:"14px 12px" }}>
                    <span style={{ padding:"4px 12px", borderRadius:6, fontSize:12, fontWeight:800, background:`${pc}22`, color:pc, border:`1px solid ${pc}44` }}>{r.priority}</span>
                  </td>
                  <td style={{ color:"#E5E7EB", fontSize:13, padding:"14px 12px" }}>{r.type==="panic"?"🚨 Pánico":r.categoryLabel||"Texto"}</td>
                  <td style={{ color:"#9CA3AF", fontSize:13, padding:"14px 12px" }}>{(r as any).zone||"—"}</td>
                  <td style={{ color:"#E5E7EB", fontSize:13, padding:"14px 12px" }}>{r.authorName||"—"}</td>
                  <td style={{ padding:"14px 12px" }}>
                    <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:600,
                      background: r.status==="closed"?"#10B98122":r.status==="attending"?"#3B82F622":"#F59E0B22",
                      color: r.status==="closed"?"#10B981":r.status==="attending"?"#3B82F6":"#F59E0B"
                    }}>
                      {r.status==="closed"?"Cerrado":r.status==="attending"?"En atención":"Recibido"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}