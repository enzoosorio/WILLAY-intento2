import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../lib/firebase";

interface Operator { id: string; displayName: string; email: string; zone: string; active?: boolean; }

export default function Operators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", zone: "centro" });
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    return onSnapshot(collection(db, "users"), snap => {
      setOperators(snap.docs.map(d => ({ id: d.id, ...d.data() } as Operator)).filter((u: any) => u.role === "operator"));
    });
  }, []);

  async function createOperator(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        displayName: form.name, email: form.email,
        role: "operator", zone: form.zone, active: true,
        expoPushTokens: [], consentLocation: false,
        consentBiometric: false, onboardingDone: true,
        createdAt: serverTimestamp(),
      });
      setMsg("✅ Operador creado exitosamente.");
      setShowForm(false);
      setForm({ name: "", email: "", password: "", zone: "centro" });
    } catch (e) {
      setMsg("❌ Error: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(op: Operator) {
    await updateDoc(doc(db, "users", op.id), { active: !op.active });
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={s.title}>Operadores Serenazgo</h1>
          <p style={s.sub}>{operators.length} operadores registrados</p>
        </div>
        <button style={s.btnPrimary} onClick={() => setShowForm(v => !v)}>
          {showForm ? "Cancelar" : "+ Nuevo operador"}
        </button>
      </div>

      {msg && <div style={{ padding:"12px 16px", borderRadius:8, background:"#161b22", border:"1px solid #30363d", marginBottom:16, fontSize:14, color: msg.startsWith("✅") ? "#10B981" : "#E53E3E" }}>{msg}</div>}

      {showForm && (
        <div style={s.formCard}>
          <h3 style={s.chartTitle}>Crear nuevo operador</h3>
          <form onSubmit={createOperator} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Nombre completo</label>
                <input style={s.input} value={form.name} onChange={e => setForm({...form, name:e.target.value})} required placeholder="Juan Pérez" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Correo electrónico</label>
                <input style={s.input} type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} required placeholder="operador@serenazgo.pe" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Contraseña inicial</label>
                <input style={s.input} type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} required minLength={8} placeholder="Mínimo 8 caracteres" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Zona asignada</label>
                <select style={s.input} value={form.zone} onChange={e => setForm({...form, zone:e.target.value})}>
                  <option value="centro">Centro</option>
                  <option value="zapallal">Zapallal / Norte</option>
                  <option value="la_ensenada">La Ensenada / Sur</option>
                  <option value="huamantanga">Huamantanga</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
            </div>
            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear operador"}
            </button>
          </form>
        </div>
      )}

      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>{["Nombre","Email","Zona","Estado","Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {operators.map(op => (
              <tr key={op.id} style={s.tr}>
                <td style={s.td}><strong>{op.displayName||"—"}</strong></td>
                <td style={s.td}>{op.email||"—"}</td>
                <td style={s.td}>{op.zone||"—"}</td>
                <td style={s.td}>
                  <span style={{ padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:700, background: op.active!==false?"#10B98122":"#E53E3E22", color: op.active!==false?"#10B981":"#E53E3E" }}>
                    {op.active!==false?"Activo":"Inactivo"}
                  </span>
                </td>
                <td style={s.td}>
                  <button style={{ border:"none", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600, background: op.active!==false?"#E53E3E22":"#10B98122", color: op.active!==false?"#E53E3E":"#10B981" }} onClick={() => toggleActive(op)}>
                    {op.active!==false?"Desactivar":"Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {operators.length===0 && <tr><td colSpan={5} style={{...s.td, textAlign:"center", color:"#8b949e"}}>No hay operadores</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  title:     { color:"#e6edf3", fontSize:28, fontWeight:900, margin:0 },
  sub:       { color:"#8b949e", fontSize:14, margin:"4px 0 0" },
  btnPrimary:{ background:"#E53E3E", color:"white", border:"none", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 },
  formCard:  { background:"#161b22", border:"1px solid #30363d", borderRadius:12, padding:24, marginBottom:24 },
  chartTitle:{ color:"#e6edf3", fontSize:15, fontWeight:700, margin:"0 0 16px" },
  label:     { color:"#8b949e", fontSize:12, fontWeight:600 },
  input:     { background:"#0d1117", border:"1px solid #30363d", borderRadius:8, padding:"10px 14px", color:"#e6edf3", fontSize:14 },
  tableCard: { background:"#161b22", border:"1px solid #30363d", borderRadius:12, padding:20 },
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { color:"#8b949e", fontSize:12, fontWeight:600, padding:"8px 12px", textAlign:"left", borderBottom:"1px solid #30363d" },
  tr:        { borderBottom:"1px solid #21262d" },
  td:        { color:"#e6edf3", fontSize:13, padding:"12px" },
};