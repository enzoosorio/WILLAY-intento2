import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const NAV = [
  { path:"/",          label:"Dashboard",  icon:"📊", desc:"Centro de operaciones" },
  { path:"/map",       label:"Mapa live",  icon:"🗺️", desc:"Incidencias en vivo" },
  { path:"/reports",   label:"Reportes",   icon:"📋", desc:"Historial completo" },
  { path:"/operators", label:"Operadores", icon:"👮", desc:"Gestión de personal" },
  { path:"/chat",      label:"Chat",       icon:"💬", desc:"Comunicación interna" },
  { path:"/history",   label:"Historial",  icon:"📜", desc:"Log de acciones" },
  { path:"/missing",   label:"Desaparecidos",icon:"🔍", desc:"Búsqueda facial" },
  { path:"/reinforcements", label:"Refuerzos", icon:"🚨", desc:"Solicitudes de campo" },
  { path:"/risk-prediction", label:"Predicción IA", icon:"🧠", desc:"Zonas de riesgo" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const now = new Date();
  const [hovered, setHovered] = useState<string|null>(null);

  return (
    <div style={{
      display:"flex", height:"100vh",
      background:"#0B1120",
      color:"#E2E8F0",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      overflow:"hidden",
    }}>
      <style>{`
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 6px #22C55E} 50%{box-shadow:0 0 14px #22C55E} }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width:240, flexShrink:0,
        background:"#0F1929",
        borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex", flexDirection:"column",
        boxShadow:"4px 0 20px rgba(0,0,0,0.3)",
      }}>

        {/* Brand */}
        <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{
              width:44, height:44, borderRadius:12, flexShrink:0,
              background:"linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, boxShadow:"0 4px 16px rgba(239,68,68,0.4)",
            }}>🛡</div>
            <div>
              <div style={{ fontSize:16, fontWeight:900, letterSpacing:2, color:"white" }}>WILLAY</div>
              <div style={{ color:"#64748B", fontSize:9, letterSpacing:1, textTransform:"uppercase" }}>Torre de Control</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:999, padding:"5px 12px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E", animation:"pulse-green 2s infinite" }} />
            <span style={{ color:"#22C55E", fontSize:10, fontWeight:700, letterSpacing:0.5 }}>EN LÍNEA</span>
            <span style={{ color:"#475569", fontSize:10, marginLeft:"auto", fontFamily:"monospace" }}>
              {now.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
          <div style={{ color:"#334155", fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", padding:"0 8px", marginBottom:8 }}>Módulos</div>
          {NAV.map(n => {
            const active = loc.pathname === n.path;
            const isHov  = hovered === n.path && !active;
            return (
              <Link key={n.path} to={n.path}
                onMouseEnter={() => setHovered(n.path)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"10px 12px", borderRadius:10,
                  textDecoration:"none", transition:"all 0.15s",
                  background: active
                    ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))"
                    : isHov ? "rgba(255,255,255,0.04)" : "transparent",
                  border: active ? "1px solid rgba(239,68,68,0.25)" : "1px solid transparent",
                  transform: isHov ? "translateX(3px)" : "none",
                }}
              >
                <div style={{
                  width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0,
                  background: active ? "linear-gradient(135deg,#EF4444,#DC2626)" : "rgba(255,255,255,0.05)",
                  boxShadow: active ? "0 4px 12px rgba(239,68,68,0.35)" : "none",
                }}>{n.icon}</div>
                <div>
                  <div style={{ color: active ? "#FCA5A5" : "#CBD5E1", fontSize:13, fontWeight:600 }}>{n.label}</div>
                  <div style={{ color:"#475569", fontSize:10 }}>{n.desc}</div>
                </div>
                {active && <div style={{ marginLeft:"auto", width:3, height:18, borderRadius:999, background:"linear-gradient(180deg,#EF4444,#DC2626)" }} />}
              </Link>
            );
          })}
        </nav>

        {/* Municipalidad */}
        <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize:18 }}>🏛️</span>
            <div>
              <div style={{ color:"#475569", fontSize:9, letterSpacing:0.5, textTransform:"uppercase" }}>Municipalidad Distrital</div>
              <div style={{ color:"#94A3B8", fontSize:11, fontWeight:700 }}>Puente Piedra</div>
            </div>
          </div>
        </div>

        {/* User */}
        <div style={{ padding:"12px 10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:10, marginBottom:8, border:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#EF4444,#7C3AED)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>👤</div>
            <div style={{ overflow:"hidden" }}>
              <div style={{ color:"#94A3B8", fontSize:10 }}>Super Administrador</div>
              <div style={{ color:"#CBD5E1", fontSize:11, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>admin@willay.pe</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} style={{
            width:"100%", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
            borderRadius:10, color:"#F87171", padding:"8px", cursor:"pointer", fontSize:12, fontWeight:600,
          }}>🚪 Cerrar sesión</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"auto", padding:"24px 28px", background:"#0B1120" }}>
        {children}
      </main>
    </div>
  );
}