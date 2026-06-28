import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell } from "recharts";

interface Report {
  id: string; priority: string; status: string; zone: string;
  type: string; categoryLabel: string; authorName: string; createdAt: any;
  location?: { latitude: number; longitude: number };
  text?: string;
}

interface Toast { id: string; priority: string; text: string; authorName: string; zone: string; location?: { latitude: number; longitude: number }; }

const C = {
  bg:       "#0B1120",
  surface:  "#111827",
  surface2: "#1A2332",
  border:   "rgba(255,255,255,0.07)",
  red:      "#EF4444",
  orange:   "#F97316",
  blue:     "#3B82F6",
  green:    "#22C55E",
  purple:   "#A855F7",
  yellow:   "#EAB308",
  text:     "#E2E8F0",
  muted:    "#64748B",
  dim:      "#334155",
};

function pColor(p: string) {
  if (p === "P1") return { solid:C.red,    light:"rgba(239,68,68,0.1)",  border:"rgba(239,68,68,0.25)" };
  if (p === "P2") return { solid:C.orange, light:"rgba(249,115,22,0.1)", border:"rgba(249,115,22,0.25)" };
  return               { solid:C.blue,   light:"rgba(59,130,246,0.1)", border:"rgba(59,130,246,0.25)" };
}

function formatTime(ts: any) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
}

function StatCard({ label, value, color, icon, sub }: any) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px 20px", borderTop:`3px solid ${color}`, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-16, right:-16, width:70, height:70, borderRadius:"50%", background:`${color}10` }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ color:C.muted, fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>{label}</div>
          <div style={{ color, fontSize:40, fontWeight:900, lineHeight:1, textShadow:`0 0 24px ${color}44` }}>{value}</div>
          {sub && <div style={{ color:C.dim, fontSize:11, marginTop:6 }}>{sub}</div>}
        </div>
        <div style={{ width:44, height:44, borderRadius:12, background:`${color}15`, border:`1px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [reports,      setReports]      = useState<Report[]>([]);
  const [newAlerts,    setNewAlerts]    = useState<Set<string>>(new Set());
  const [toasts,       setToasts]       = useState<Toast[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [now,          setNow]          = useState(new Date());
  const [dbStatus,     setDbStatus]     = useState<"connecting"|"ok"|"error">("connecting");
  const prevIdsRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { const iv = setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(iv); },[]);

  function playAlert(priority: string) {
    if (!audioCtxRef.current) return;
    const ctx  = audioCtxRef.current;
    const freq = priority === "P1" ? 880 : priority === "P2" ? 660 : 440;
    const times = priority === "P1" ? [0, 0.25, 0.5] : [0, 0.3];

    times.forEach(delay => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  }

  function enableAudio() {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    ctx.resume().then(() => {
      setAudioEnabled(true);
      // Sonido de confirmación
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    });
  }

  useEffect(()=>{
    if (Notification.permission==="default") Notification.requestPermission();
    return onSnapshot(collection(db,"reports"), snap=>{
      const docs = snap.docs.map(d=>({id:d.id,...d.data()} as Report));
      const currentIds = new Set(docs.map(d=>d.id));
      const newIds = new Set<string>();
      currentIds.forEach(id=>{ if(!prevIdsRef.current.has(id)&&prevIdsRef.current.size>0) newIds.add(id); });

      if(newIds.size>0){
        setNewAlerts(prev=>new Set([...prev,...newIds]));
        const newDocs = docs.filter(d=>newIds.has(d.id));

        // Toast por cada nueva alerta
        newDocs.forEach(r => {
          const toast: Toast = {
            id: r.id, priority: r.priority,
            text: (r as any).text || "",
            authorName: (r as any).authorName || "—",
            zone: (r as any).zone || "—",
            location: (r as any).location,
          };
          setToasts(prev => [...prev.slice(-4), toast]);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== r.id)), 8000);
          // Sonido
          playAlert(r.priority);
        });

        // Notificación del navegador para P1
        const newP1 = docs.filter(d=>newIds.has(d.id)&&d.priority==="P1");
        if(newP1.length>0 && Notification.permission==="granted"){
          new Notification("🚨 ALERTA P1 — WILLAY", { body:`Incidente crítico en Puente Piedra` });
        }

        setTimeout(()=>setNewAlerts(prev=>{const n=new Set(prev);newIds.forEach(id=>n.delete(id));return n;}),10000);
      }
      prevIdsRef.current=currentIds;
      setReports(docs);
      setDbStatus("ok");
    },()=>setDbStatus("error"));
  },[]);

  const p1 = reports.filter(r=>r.priority==="P1").length;
  const p2 = reports.filter(r=>r.priority==="P2").length;
  const p3 = reports.filter(r=>r.priority==="P3").length;
  const active   = reports.filter(r=>r.status!=="closed"&&r.status!=="dismissed").length;
  const resolved = reports.filter(r=>r.status==="closed").length;
  const panic    = reports.filter(r=>r.type==="panic").length;

  const byZone = Object.entries(
    reports.reduce((acc,r)=>{const z=(r as any).zone||"otros";acc[z]=(acc[z]||0)+1;return acc;},{} as Record<string,number>)
  ).map(([zone,count])=>({zone,count})).sort((a,b)=>b.count-a.count);

  const byHour = Array.from({length:24},(_,h)=>({
    hour:`${h}h`,
    count:reports.filter(r=>r.createdAt?.toDate&&r.createdAt.toDate().getHours()===h).length,
  }));

  const pieData = [
    {name:"P1",value:p1,color:C.red},
    {name:"P2",value:p2,color:C.orange},
    {name:"P3",value:p3,color:C.blue},
  ].filter(d=>d.value>0);

  const activeAlerts = [...reports]
    .filter(r=>r.status!=="closed"&&r.status!=="dismissed")
    .sort((a,b)=>({P1:0,P2:1,P3:2}[a.priority as "P1"|"P2"|"P3"]??3)-({P1:0,P2:1,P3:2}[b.priority as "P1"|"P2"|"P3"]??3));

  return (
    <div style={{ minHeight:"100vh" }}>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
        @keyframes slide-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes toast-in{from{opacity:0;transform:translateX(120px)}to{opacity:1;transform:translateX(0)}}
        @keyframes progress{from{width:100%}to{width:0%}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
      `}</style>

      {/* TOASTS */}
      <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:10, width:360 }}>
        {toasts.map(t => {
          const pc  = pColor(t.priority);
          const isP1 = t.priority === "P1";
          return (
            <div key={t.id} style={{
              background: isP1 ? "linear-gradient(135deg,#450a0a,#7f1d1d)" : C.surface,
              border:`1px solid ${pc.border}`,
              borderLeft:`4px solid ${pc.solid}`,
              borderRadius:14, padding:"14px 16px",
              boxShadow:`0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${pc.solid}22`,
              animation: isP1 ? "toast-in 0.3s ease, shake 0.5s ease 0.3s" : "toast-in 0.3s ease",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", bottom:0, left:0, height:3, background:`linear-gradient(90deg,${pc.solid},${pc.solid}88)`, animation:"progress 8s linear forwards", borderRadius:"0 2px 0 14px" }}/>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${pc.solid}20`, border:`1px solid ${pc.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {isP1 ? "🚨" : t.priority==="P2" ? "⚠️" : "ℹ️"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <span style={{ color:pc.solid, fontSize:11, fontWeight:800, background:`${pc.solid}20`, padding:"1px 8px", borderRadius:4 }}>{t.priority}</span>
                    <span style={{ color:isP1?"#FCA5A5":"#E2E8F0", fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>
                      {t.text ? t.text.slice(0,35) : "Nueva alerta recibida"}
                    </span>
                    {isP1 && <span style={{ color:C.red, fontSize:9, fontWeight:800, animation:"blink 0.5s infinite", marginLeft:"auto" }}>● CRÍTICO</span>}
                  </div>
                  <div style={{ display:"flex", gap:10, marginBottom:6 }}>
                    <span style={{ color:isP1?"#FCA5A580":C.muted, fontSize:11 }}>👤 {t.authorName}</span>
                    <span style={{ color:isP1?"#FCA5A580":C.muted, fontSize:11 }}>📍 {t.zone}</span>
                  </div>
                  {t.location?.latitude && (
                    <button onClick={()=>window.open(`https://www.google.com/maps?q=${t.location!.latitude},${t.location!.longitude}&z=17`,"_blank")} style={{ background:pc.solid, border:"none", borderRadius:6, color:"white", fontSize:10, padding:"4px 12px", cursor:"pointer", fontWeight:700, boxShadow:`0 2px 8px ${pc.solid}44` }}>
                      🗺 Ver ubicación →
                    </button>
                  )}
                </div>
                <button onClick={()=>setToasts(prev=>prev.filter(x=>x.id!==t.id))} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:18, padding:0, lineHeight:1, flexShrink:0 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg, #7F1D1D 0%, #DC2626 45%, #EA580C 100%)", borderRadius:16, padding:"20px 28px", marginBottom:20, boxShadow:"0 8px 32px rgba(220,38,38,0.3)", position:"relative", overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{position:"absolute",bottom:-40,right:120,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative", zIndex:1 }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>🛡 Municipalidad Distrital de Puente Piedra</div>
            <h1 style={{ color:"white", fontSize:26, fontWeight:900, margin:"0 0 5px", textShadow:"0 2px 8px rgba(0,0,0,0.2)" }}>Torre de Control — WILLAY</h1>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>{now.toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Botón de sonido */}
            <button onClick={enableAudio} style={{
              background: audioEnabled ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)",
              border: `1px solid ${audioEnabled ? "rgba(34,197,94,0.4)" : "rgba(234,179,8,0.4)"}`,
              borderRadius:10, padding:"8px 16px",
              color: audioEnabled ? "#4ADE80" : "#FDE047",
              cursor:"pointer", fontSize:12, fontWeight:700,
              backdropFilter:"blur(10px)",
            }}>
              {audioEnabled ? "🔊 Sonido ON" : "🔇 Activar sonido"}
            </button>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"white", fontSize:36, fontWeight:900, fontFamily:"monospace", textShadow:"0 2px 12px rgba(0,0,0,0.3)" }}>{now.toLocaleTimeString("es-PE")}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end", marginTop:6, background:"rgba(0,0,0,0.2)", borderRadius:999, padding:"5px 14px" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:dbStatus==="ok"?"#4ADE80":"#FCA5A5", boxShadow:`0 0 10px ${dbStatus==="ok"?"#4ADE80":"#FCA5A5"}`, animation:"pulse-dot 2s infinite" }}/>
                <span style={{ color:"white", fontSize:11, fontWeight:700 }}>{dbStatus==="ok"?(p1>0?`⚠ ${p1} ALERTA(S) P1`:"SISTEMA ACTIVO"):"DESCONECTADO"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
        <StatCard label="Total reportes" value={reports.length} color={C.purple} icon="📊" sub="Histórico total"/>
        <StatCard label="P1 Críticos"    value={p1}             color={C.red}    icon="🚨" sub="Atención inmediata"/>
        <StatCard label="P2 Moderados"   value={p2}             color={C.orange} icon="⚠️" sub="En seguimiento"/>
        <StatCard label="P3 Menores"     value={p3}             color={C.blue}   icon="ℹ️" sub="Bajo riesgo"/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        <StatCard label="Activos ahora"  value={active}   color={C.yellow} icon="🔴" sub="Sin resolver"/>
        <StatCard label="Resueltos"      value={resolved} color={C.green}  icon="✅" sub="Cerrados"/>
        <StatCard label="Alertas pánico" value={panic}    color={C.red}    icon="🆘" sub="Botón de pánico"/>
      </div>

      {/* MAIN */}
      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 0.7fr", gap:16, marginBottom:16 }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ color:C.text, fontSize:15, fontWeight:800 }}>🚨 Alertas activas</div>
              <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>{activeAlerts.length} incidencias pendientes</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:999, padding:"4px 12px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:C.green, animation:"pulse-dot 2s infinite" }}/>
              <span style={{ color:C.green, fontSize:10, fontWeight:700 }}>EN VIVO</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:380, overflowY:"auto" }}>
            {activeAlerts.length===0 ? (
              <div style={{ textAlign:"center", padding:48, color:C.muted }}>
                <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>Sin alertas activas</div>
              </div>
            ) : activeAlerts.map(r=>{
              const pc = pColor(r.priority);
              const isNew = newAlerts.has(r.id);
              return (
                <div key={r.id} style={{ background:isNew?pc.light:C.surface2, border:`1px solid ${isNew?pc.border:C.border}`, borderLeft:`4px solid ${pc.solid}`, borderRadius:10, padding:"12px 14px", animation:isNew?"slide-in 0.3s ease":"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ padding:"2px 10px", borderRadius:6, fontSize:11, fontWeight:800, background:pc.light, color:pc.solid, border:`1px solid ${pc.border}` }}>{r.priority}</span>
                    <span style={{ color:C.text, fontSize:13, fontWeight:700 }}>{r.type==="panic"?"🚨 Alerta de Pánico":r.categoryLabel||"Reporte"}</span>
                    {isNew && <span style={{ marginLeft:"auto", color:pc.solid, fontSize:10, fontWeight:800, animation:"blink 0.8s infinite" }}>● NUEVO</span>}
                  </div>
                  <div style={{ color:C.muted, fontSize:12, marginBottom:6 }}>{r.text?.slice(0,80)||"Sin descripción"}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                    <span style={{ color:C.dim, fontSize:11 }}>👤 {r.authorName||"—"}</span>
                    <span style={{ color:C.dim, fontSize:11 }}>📍 {(r as any).zone||"—"}</span>
                    <span style={{ color:C.dim, fontSize:11 }}>🕐 {formatTime(r.createdAt)}</span>
                    {r.location?.latitude && (
                      <button onClick={()=>window.open(`https://www.google.com/maps?q=${r.location!.latitude},${r.location!.longitude}&z=17`,"_blank")} style={{ marginLeft:"auto", background:"linear-gradient(135deg,#DC2626,#EF4444)", border:"none", borderRadius:8, color:"white", fontSize:11, padding:"4px 12px", cursor:"pointer", fontWeight:700 }}>🗺 Ver mapa</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", flex:1 }}>
            <div style={{ color:C.text, fontSize:14, fontWeight:800, marginBottom:14 }}>📊 Por prioridad</div>
            {pieData.length===0 ? <div style={{ color:C.muted, textAlign:"center", padding:20, fontSize:12 }}>Sin datos</div> : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={38} paddingAngle={4}>
                      {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
                  {pieData.map(d=>(
                    <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 10px", background:C.surface2, borderRadius:8, border:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:d.color, boxShadow:`0 0 6px ${d.color}` }}/>
                        <span style={{ color:C.muted, fontSize:11 }}>{d.name} — {d.name==="P1"?"Crítico":d.name==="P2"?"Moderado":"Menor"}</span>
                      </div>
                      <span style={{ color:d.color, fontWeight:800, fontSize:14 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
            <div style={{ color:C.text, fontSize:14, fontWeight:800, marginBottom:12 }}>📈 Actividad por hora</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={byHour}>
                <defs>
                  <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.red} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{fill:C.dim,fontSize:8}} axisLine={false} tickLine={false} interval={4}/>
                <YAxis hide/>
                <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,fontSize:11}}/>
                <Area type="monotone" dataKey="count" stroke={C.red} strokeWidth={2} fill="url(#aG)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Zonas */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
        <div style={{ color:C.text, fontSize:14, fontWeight:800, marginBottom:14 }}>📍 Incidencias por zona</div>
        {byZone.length===0 ? <div style={{ color:C.muted, textAlign:"center", padding:20, fontSize:13 }}>Sin reportes aún</div> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byZone} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.surface2}/>
              <XAxis dataKey="zone" tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,fontSize:12}}/>
              <Bar dataKey="count" radius={[6,6,0,0]}>
                {byZone.map((_,i)=><Cell key={i} fill={[C.red,C.purple,C.blue,C.orange,C.green][i%5]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Emergencias */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          {label:"Serenazgo PP",    num:"(01) 219-6220", icon:"🚔", color:C.red},
          {label:"Policía Nacional", num:"105",           icon:"👮", color:C.blue},
          {label:"Bomberos",         num:"116",           icon:"🚒", color:C.orange},
          {label:"SAMU",             num:"106",           icon:"🚑", color:C.green},
        ].map(item=>(
          <div key={item.label} style={{ background:C.surface, border:`1px solid ${item.color}25`, borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 16px rgba(0,0,0,0.15)", borderLeft:`4px solid ${item.color}` }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${item.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{item.icon}</div>
            <div>
              <div style={{ color:C.muted, fontSize:10, fontWeight:600, marginBottom:3 }}>{item.label}</div>
              <div style={{ color:item.color, fontSize:18, fontWeight:900, textShadow:`0 0 12px ${item.color}44` }}>{item.num}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}