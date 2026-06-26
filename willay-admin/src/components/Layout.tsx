import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const NAV = [
  { path: "/",          label: "Dashboard",  icon: "📊", desc: "Resumen general" },
  { path: "/map",       label: "Mapa live",  icon: "🗺️", desc: "Incidencias en vivo" },
  { path: "/reports",   label: "Reportes",   icon: "📋", desc: "Historial completo" },
  { path: "/operators", label: "Operadores", icon: "👮", desc: "Gestión de personal" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const now = new Date();

  return (
    <div style={{ display:"flex", height:"100vh", background:"#0a0e17", color:"#e6edf3", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", overflow:"hidden" }}>
      {/* Sidebar */}
      <aside style={{ width:260, background:"#0d1117", borderRight:"1px solid #1c2333", display:"flex", flexDirection:"column", padding:"0", flexShrink:0 }}>
        
        {/* Brand */}
        <div style={{ padding:"28px 20px 24px", borderBottom:"1px solid #1c2333" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#EF4444,#B91C1C)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 4px 12px #EF444444" }}>
              🛡
            </div>
            <div>
              <div style={{ color:"#EF4444", fontWeight:900, fontSize:18, letterSpacing:2 }}>WILLAY</div>
              <div style={{ color:"#6B7280", fontSize:10, letterSpacing:1, textTransform:"uppercase" }}>Torre de Control</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"#10B98122", border:"1px solid #10B98144", borderRadius:8, padding:"6px 10px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 6px #10B981" }} />
            <span style={{ color:"#10B981", fontSize:11, fontWeight:600 }}>SISTEMA ACTIVO</span>
            <span style={{ color:"#6B7280", fontSize:11, marginLeft:"auto" }}>{now.toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit" })}</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ color:"#6B7280", fontSize:10, fontWeight:600, letterSpacing:2, textTransform:"uppercase", padding:"0 8px", marginBottom:8 }}>Navegación</div>
          {NAV.map(n => {
            const active = loc.pathname === n.path;
            return (
              <Link key={n.path} to={n.path} style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                borderRadius:10, textDecoration:"none",
                background: active ? "#EF444422" : "transparent",
                border: active ? "1px solid #EF444444" : "1px solid transparent",
                transition:"all 0.15s",
              }}>
                <span style={{ fontSize:18 }}>{n.icon}</span>
                <div>
                  <div style={{ color: active ? "#EF4444" : "#D1D5DB", fontSize:13, fontWeight:600 }}>{n.label}</div>
                  <div style={{ color:"#6B7280", fontSize:11 }}>{n.desc}</div>
                </div>
                {active && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:"#EF4444" }} />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"16px 12px", borderTop:"1px solid #1c2333" }}>
          <div style={{ padding:"12px 14px", background:"#161b22", borderRadius:10, marginBottom:8 }}>
            <div style={{ color:"#9CA3AF", fontSize:11 }}>Super Administrador</div>
            <div style={{ color:"#E5E7EB", fontSize:13, fontWeight:600, marginTop:2 }}>admin@willay.pe</div>
          </div>
          <button onClick={() => signOut(auth)} style={{
            width:"100%", background:"none", border:"1px solid #30363d",
            borderRadius:8, color:"#6B7280", padding:"10px", cursor:"pointer",
            fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"auto", padding:"32px 36px", background:"#0a0e17" }}>
        {children}
      </main>
    </div>
  );
}