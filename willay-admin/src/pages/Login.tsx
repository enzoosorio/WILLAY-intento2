import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (snap.data()?.role !== "super_admin") {
        await auth.signOut();
        setError("Acceso denegado. Solo Super Administradores.");
      }
    } catch {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0a0f1a 100%)",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-20px) rotate(180deg)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(1.8);opacity:0} }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        input::placeholder { color: #4B5563; }
        input:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); outline: none; }
      `}</style>

      {/* Fondo decorativo */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"10%", left:"5%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"5%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%)" }} />
        {/* Grid lines */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)", backgroundSize:"50px 50px" }} />
      </div>

      <div style={{ width:440, position:"relative", zIndex:1 }}>

        {/* Logo flotante */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ position:"relative", display:"inline-block", marginBottom:16 }}>
            <div style={{ position:"absolute", inset:-4, borderRadius:"50%", border:"1px solid rgba(99,102,241,0.3)", animation:"pulse-ring 2s ease-out infinite" }} />
            <div style={{ position:"absolute", inset:-12, borderRadius:"50%", border:"1px solid rgba(99,102,241,0.15)", animation:"pulse-ring 2s ease-out infinite 0.5s" }} />
            <div style={{
              width:80, height:80, borderRadius:"50%",
              background:"linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:36, boxShadow:"0 8px 32px rgba(99,102,241,0.5)",
            }}>🛡</div>
          </div>
          <div style={{ fontSize:32, fontWeight:900, letterSpacing:3, background:"linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #67e8f9 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundSize:"200% 200%", animation:"gradient-shift 3s ease infinite" }}>
            WILLAY
          </div>
          <div style={{ color:"#6366F1", fontSize:12, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginTop:4 }}>
            Torre de Control
          </div>
          <div style={{ color:"#4B5563", fontSize:11, marginTop:4 }}>
            Municipalidad Distrital de Puente Piedra
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:"rgba(13,17,23,0.8)",
          border:"1px solid rgba(99,102,241,0.15)",
          borderRadius:20,
          padding:"36px 36px 32px",
          backdropFilter:"blur(20px)",
          boxShadow:"0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          position:"relative", overflow:"hidden",
        }}>
          {/* Glow top */}
          <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:1, background:"linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)" }} />

          <div style={{ color:"#E5E7EB", fontSize:18, fontWeight:800, marginBottom:6 }}>Iniciar sesión</div>
          <div style={{ color:"#4B5563", fontSize:13, marginBottom:24 }}>Acceso exclusivo — Personal autorizado</div>

          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:"#9CA3AF", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Correo electrónico</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16 }}>✉️</span>
                <input
                  style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"13px 16px 13px 42px", color:"#E5E7EB", fontSize:14, boxSizing:"border-box", transition:"all 0.2s" }}
                  type="email" placeholder="admin@willay.pe"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:"#9CA3AF", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Contraseña</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16 }}>🔒</span>
                <input
                  style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"13px 44px 13px 42px", color:"#E5E7EB", fontSize:14, boxSizing:"border-box", transition:"all 0.2s" }}
                  type={showPass?"text":"password"} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required
                />
                <button type="button" onClick={() => setShowPass(v=>!v)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16 }}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", color:"#EF4444", fontSize:13 }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width:"100%", padding:"14px",
              background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)",
              backgroundSize:"200% 200%",
              border:"none", borderRadius:12,
              color:"white", fontSize:15, fontWeight:800, letterSpacing:1,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 8px 24px rgba(99,102,241,0.4)",
              transition:"all 0.3s",
              animation: loading ? "none" : "gradient-shift 3s ease infinite",
            }}>
              {loading ? "⏳ Verificando acceso..." : "🔐 INGRESAR AL SISTEMA"}
            </button>
          </form>

          {/* Footer card */}
          <div style={{ marginTop:24, padding:"12px 16px", background:"rgba(255,255,255,0.02)", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)", textAlign:"center" }}>
            <div style={{ color:"#4B5563", fontSize:11, lineHeight:1.8 }}>
              🏛️ Municipalidad Distrital de Puente Piedra<br/>
              🚔 Serenazgo: <span style={{ color:"#6366F1" }}>(01) 219-6220</span> &nbsp;·&nbsp; 🚨 Emergencias: <span style={{ color:"#EF4444" }}>105</span>
            </div>
          </div>

          {/* Glow bottom */}
          <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:1, background:"linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)" }} />
        </div>

        <div style={{ textAlign:"center", marginTop:20, color:"#374151", fontSize:11 }}>
          © 2026 Sistema WILLAY — Seguridad Ciudadana Puente Piedra
        </div>
      </div>
    </div>
  );
}