import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, authSecondary } from "../lib/firebase";

interface Operator {
  id: string; displayName: string; email: string; zone: string;
  active?: boolean; role: string; subRole?: string;
  dni?: string; nombres?: string; apellidos?: string;
  celular?: string; serenazgoId?: string;
}

const ZONES = [
  // ZONA SUR
  { value:"ensenada",         label:"La Ensenada (SUR)" },
  { value:"laderas",          label:"Laderas (SUR)" },
  { value:"chillon",          label:"Chillón (SUR)" },
  { value:"shangrila",        label:"Shangri-La (SUR)" },
  // ZONA CENTRO
  { value:"tambo_inga_oeste", label:"Tambo Inga Oeste (CENTRO)" },
  { value:"tambo_inga_este",  label:"Tambo Inga Este (CENTRO)" },
  { value:"pampa_libre",      label:"Pampa Libre (CENTRO)" },
  { value:"gallinazos",       label:"Gallinazos (CENTRO)" },
  { value:"santa_rosa",       label:"Santa Rosa (CENTRO)" },
  { value:"cercado",          label:"Cercado (CENTRO)" },
  { value:"las_vegas",        label:"Las Vegas (CENTRO)" },
  { value:"la_grama",         label:"La Grama (CENTRO)" },
  { value:"copacabana",       label:"Copacabana (CENTRO)" },
  // ZONA NORTE
  { value:"el_dorado",        label:"El Dorado (NORTE)" },
  { value:"leoncio_prado",    label:"Leoncio Prado (NORTE)" },
  { value:"jerusalem",        label:"Jerusalén (NORTE)" },
  { value:"lomas",            label:"Lomas (NORTE)" },
];

const SUB_ROLES = [
  { value:"serenazgo", label:"🛡 Serenazgo", color:"#F59E0B" },
  { value:"pnp",       label:"👮 PNP",        color:"#3B82F6" },
  { value:"bomberos",  label:"🚒 Bomberos",   color:"#EF4444" },
  { value:"samu",      label:"🚑 SAMU",       color:"#10B981" },
  { value:"otro",      label:"⚙️ Otro",       color:"#6B7280" },
];

function getSubRoleInfo(val?: string) {
  return SUB_ROLES.find(r => r.value === val) || SUB_ROLES[SUB_ROLES.length - 1];
}

function generateSerenazgoId(subRole: string) {
  const prefix = subRole === "serenazgo" ? "SER" : subRole === "pnp" ? "PNP" : subRole === "bomberos" ? "BOM" : subRole === "samu" ? "SAM" : "OTR";
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export default function Operators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<Operator | null>(null);
  const [form, setForm] = useState({
    nombres:"", apellidos:"", email:"", password:"",
    dni:"", celular:"", zone:"centro", subRole:"serenazgo", serenazgoId:""
  });
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState("");
  const [confirm,   setConfirm]   = useState(false);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [viewing,   setViewing]   = useState<Operator | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, "users"), snap => {
      setOperators(snap.docs.map(d => ({ id: d.id, ...d.data() } as Operator)).filter((u: any) => u.role === "operator" || u.role === "super_admin"));
    });
  }, []);

  // Auto-generar ID al cambiar subRole
  useEffect(() => {
    if (showForm) setForm(f => ({ ...f, serenazgoId: generateSerenazgoId(f.subRole) }));
  }, [form.subRole, showForm]);

  const ops    = operators.filter(o => o.role === "operator");
  const admins = operators.filter(o => o.role === "super_admin");

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(selected.size === ops.length ? new Set() : new Set(ops.map(o => o.id)));
  }

  async function deleteSelected() {
    setLoading(true);
    try {
      await Promise.all([...selected].map(id => deleteDoc(doc(db, "users", id))));
      setMsg(`✅ ${selected.size} operador(es) eliminado(s).`);
      setSelected(new Set());
      setConfirm(false);
    } catch {
      setMsg("❌ Error al eliminar.");
    } finally {
      setLoading(false);
    }
  }

  async function createOperator(e: React.FormEvent) {
    e.preventDefault();
    if (form.dni.length !== 8) { setMsg("❌ El DNI debe tener 8 dígitos."); return; }
    if (form.celular.length < 9) { setMsg("❌ El celular debe tener al menos 9 dígitos."); return; }
    setLoading(true); setMsg("");
    try {
      const cred = await createUserWithEmailAndPassword(authSecondary, form.email, form.password);
      const uid  = cred.user.uid;
      await signOut(authSecondary);

      const displayName = `${form.nombres} ${form.apellidos}`.trim();
      await setDoc(doc(db, "users", uid), {
        displayName, nombres: form.nombres, apellidos: form.apellidos,
        email: form.email, dni: form.dni, celular: form.celular,
        serenazgoId: form.serenazgoId,
        role: "operator", subRole: form.subRole,
        zone: form.zone, active: true,
        onboardingDone: true, expoPushTokens: [],
        consentLocation: false, consentBiometric: false,
        createdAt: serverTimestamp(),
      });

      setMsg(`✅ Operador creado. ID: ${form.serenazgoId}. Ya puede iniciar sesión en la app.`);
      setShowForm(false);
      setForm({ nombres:"", apellidos:"", email:"", password:"", dni:"", celular:"", zone:"centro", subRole:"serenazgo", serenazgoId:"" });
    } catch (e) {
      setMsg("❌ Error: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setLoading(true); setMsg("");
    try {
      const displayName = `${form.nombres} ${form.apellidos}`.trim();
      await updateDoc(doc(db, "users", editing.id), {
        displayName, nombres: form.nombres, apellidos: form.apellidos,
        dni: form.dni, celular: form.celular,
        zone: form.zone, subRole: form.subRole,
      });
      setMsg("✅ Operador actualizado.");
      setEditing(null);
    } catch {
      setMsg("❌ Error al actualizar.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(op: Operator) {
    await updateDoc(doc(db, "users", op.id), { active: !op.active });
  }

  function startEdit(op: Operator) {
    setEditing(op);
    setViewing(null);
    setForm({
      nombres: op.nombres||op.displayName||"", apellidos: op.apellidos||"",
      email: op.email||"", password:"",
      dni: op.dni||"", celular: op.celular||"",
      zone: op.zone||"centro", subRole: op.subRole||"serenazgo",
      serenazgoId: op.serenazgoId||"",
    });
    setShowForm(false);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={s.title}>Gestión de Usuarios</h1>
          <p style={s.sub}>{ops.length} operadores · {admins.length} super admin</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {selected.size > 0 && (
            <button onClick={() => setConfirm(true)} style={{ background:"#EF444422", border:"1px solid #EF4444", borderRadius:8, padding:"10px 20px", color:"#EF4444", cursor:"pointer", fontWeight:700, fontSize:14 }}>
              🗑️ Eliminar ({selected.size})
            </button>
          )}
          <button style={s.btnPrimary} onClick={() => { setShowForm(v => !v); setEditing(null); setViewing(null); }}>
            {showForm ? "Cancelar" : "+ Nuevo operador"}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding:"12px 16px", borderRadius:8, background:"#161b22", border:"1px solid #30363d", marginBottom:16, fontSize:14, color: msg.startsWith("✅") ? "#10B981" : "#EF4444" }}>
          {msg}
        </div>
      )}

      {confirm && (
        <div style={{ background:"#EF444422", border:"1px solid #EF4444", borderRadius:12, padding:20, marginBottom:20 }}>
          <p style={{ color:"#EF4444", fontWeight:700, margin:"0 0 12px" }}>⚠️ ¿Eliminar {selected.size} operador(es)?</p>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={deleteSelected} disabled={loading} style={{ background:"#EF4444", color:"white", border:"none", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontWeight:700 }}>
              {loading ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button onClick={() => setConfirm(false)} style={{ background:"#161b22", color:"#9CA3AF", border:"1px solid #30363d", borderRadius:8, padding:"10px 20px", cursor:"pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Form crear */}
      {showForm && (
        <div style={s.formCard}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ ...s.chartTitle, margin:0 }}>➕ Crear nuevo operador</h3>
            <div style={{ background:"#F59E0B22", border:"1px solid #F59E0B44", borderRadius:8, padding:"6px 14px", color:"#F59E0B", fontSize:13, fontWeight:700 }}>
              ID: {form.serenazgoId || "—"}
            </div>
          </div>
          <form onSubmit={createOperator} style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Rol */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <label style={s.label}>Rol / Institución</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {SUB_ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setForm({...form, subRole:r.value})} style={{
                    padding:"10px 18px", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13,
                    background: form.subRole===r.value ? `${r.color}33` : "#0d1117",
                    border: form.subRole===r.value ? `2px solid ${r.color}` : "2px solid #30363d",
                    color: form.subRole===r.value ? r.color : "#6B7280",
                  }}>{r.label}</button>
                ))}
              </div>
            </div>

            {/* Datos personales */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Nombres</label>
                <input style={s.input} value={form.nombres} onChange={e => setForm({...form, nombres:e.target.value})} required placeholder="Juan Carlos" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Apellidos</label>
                <input style={s.input} value={form.apellidos} onChange={e => setForm({...form, apellidos:e.target.value})} required placeholder="Pérez García" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>DNI (8 dígitos)</label>
                <input style={s.input} value={form.dni} onChange={e => setForm({...form, dni:e.target.value.replace(/\D/g,"")})} required maxLength={8} minLength={8} placeholder="12345678" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Celular</label>
                <input style={s.input} value={form.celular} onChange={e => setForm({...form, celular:e.target.value.replace(/\D/g,"")})} required maxLength={9} placeholder="987654321" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>ID de Serenazgo</label>
                <div style={{ display:"flex", gap:8 }}>
                  <input style={{ ...s.input, flex:1 }} value={form.serenazgoId} onChange={e => setForm({...form, serenazgoId:e.target.value})} required placeholder="SER-1234" />
                  <button type="button" onClick={() => setForm(f => ({...f, serenazgoId: generateSerenazgoId(f.subRole)}))} style={{ background:"#F59E0B22", border:"1px solid #F59E0B44", borderRadius:8, padding:"0 12px", color:"#F59E0B", cursor:"pointer", fontSize:12, fontWeight:700 }}>
                    🔄
                  </button>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Zona asignada</label>
                <select style={s.input} value={form.zone} onChange={e => setForm({...form, zone:e.target.value})}>
                  {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              </div>
            </div>

            {/* Acceso */}
            <div style={{ background:"#0d1117", borderRadius:10, padding:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Correo electrónico</label>
                <input style={s.input} type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} required placeholder="operador@serenazgo.pe" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Contraseña inicial</label>
                <div style={{ position:"relative" }}>
                  <input
                    style={{ ...s.input, width:"100%", boxSizing:"border-box", paddingRight:44 }}
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm({...form, password:e.target.value})}
                    required minLength={8} placeholder="Mínimo 8 caracteres"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#6B7280", fontSize:16, padding:0 }}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>

            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear operador"}
            </button>
          </form>
        </div>
      )}

      {/* Form editar */}
      {editing && (
        <div style={{ ...s.formCard, borderColor:"#3B82F644" }}>
          <h3 style={s.chartTitle}>✏️ Editar — {editing.displayName}</h3>
          <form onSubmit={saveEdit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <label style={s.label}>Rol / Institución</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {SUB_ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setForm({...form, subRole:r.value})} style={{
                    padding:"10px 18px", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13,
                    background: form.subRole===r.value ? `${r.color}33` : "#0d1117",
                    border: form.subRole===r.value ? `2px solid ${r.color}` : "2px solid #30363d",
                    color: form.subRole===r.value ? r.color : "#6B7280",
                  }}>{r.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Nombres</label>
                <input style={s.input} value={form.nombres} onChange={e => setForm({...form, nombres:e.target.value})} required />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Apellidos</label>
                <input style={s.input} value={form.apellidos} onChange={e => setForm({...form, apellidos:e.target.value})} required />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>DNI</label>
                <input style={s.input} value={form.dni} onChange={e => setForm({...form, dni:e.target.value.replace(/\D/g,"")})} maxLength={8} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Celular</label>
                <input style={s.input} value={form.celular} onChange={e => setForm({...form, celular:e.target.value.replace(/\D/g,"")})} maxLength={9} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={s.label}>Zona asignada</label>
                <select style={s.input} value={form.zone} onChange={e => setForm({...form, zone:e.target.value})}>
                  {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button style={s.btnPrimary} type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
              <button type="button" onClick={() => setEditing(null)} style={{ background:"transparent", border:"1px solid #30363d", borderRadius:8, padding:"10px 20px", color:"#9CA3AF", cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista detalle operador */}
      {viewing && (
        <div style={{ ...s.formCard, borderColor:"#6366F144" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ ...s.chartTitle, margin:0 }}>👤 Ficha de operador</h3>
            <button onClick={() => setViewing(null)} style={{ background:"none", border:"none", color:"#6B7280", cursor:"pointer", fontSize:20 }}>✕</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { label:"ID Serenazgo", value: viewing.serenazgoId||"—", color:"#F59E0B" },
              { label:"Rol", value: getSubRoleInfo(viewing.subRole).label },
              { label:"Nombres", value: viewing.nombres||"—" },
              { label:"Apellidos", value: viewing.apellidos||"—" },
              { label:"DNI", value: viewing.dni||"—" },
              { label:"Celular", value: viewing.celular ? `+51 ${viewing.celular}` : "—" },
              { label:"Email", value: viewing.email||"—" },
              { label:"Zona", value: viewing.zone||"—" },
            ].map(item => (
              <div key={item.label} style={{ background:"#0d1117", borderRadius:8, padding:"10px 14px" }}>
                <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{item.label}</div>
                <div style={{ color:(item as any).color||"#F9FAFB", fontSize:14, fontWeight:700 }}>{item.value}</div>
              </div>
            ))}
          </div>
          {viewing.celular && (
            <a href={`tel:+51${viewing.celular}`} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:16, background:"#10B98122", border:"1px solid #10B98144", borderRadius:10, padding:"12px", color:"#10B981", textDecoration:"none", fontWeight:700, fontSize:14 }}>
              📞 Llamar a +51 {viewing.celular}
            </a>
          )}
        </div>
      )}

      {/* Tabla operadores */}
      <div style={s.tableCard}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700 }}>👮 Operadores</div>
          {ops.length > 0 && (
            <button onClick={toggleSelectAll} style={{ background:"transparent", border:"1px solid #30363d", borderRadius:8, padding:"6px 14px", color:"#9CA3AF", cursor:"pointer", fontSize:12 }}>
              {selected.size === ops.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
          )}
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}><input type="checkbox" checked={selected.size === ops.length && ops.length > 0} onChange={toggleSelectAll} /></th>
              {["ID","Nombre","Rol","Zona","Celular","Estado","Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {ops.map(op => {
              const sr = getSubRoleInfo(op.subRole);
              return (
                <tr key={op.id} style={{ ...s.tr, background: selected.has(op.id) ? "#EF444411" : "transparent" }}>
                  <td style={s.td}><input type="checkbox" checked={selected.has(op.id)} onChange={() => toggleSelect(op.id)} /></td>
                  <td style={s.td}><span style={{ color:"#F59E0B", fontWeight:700, fontSize:12 }}>{op.serenazgoId||"—"}</span></td>
                  <td style={s.td}>
                    <div style={{ fontWeight:600 }}>{op.displayName||"—"}</div>
                    <div style={{ color:"#6B7280", fontSize:11 }}>{op.dni ? `DNI: ${op.dni}` : ""}</div>
                  </td>
                  <td style={s.td}>
                    <span style={{ padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:700, background:`${sr.color}22`, color:sr.color }}>
                      {sr.label}
                    </span>
                  </td>
                  <td style={s.td}>{op.zone||"—"}</td>
                  <td style={s.td}>{op.celular ? `+51 ${op.celular}` : "—"}</td>
                  <td style={s.td}>
                    <span style={{ padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:700, background: op.active!==false?"#10B98122":"#EF444422", color: op.active!==false?"#10B981":"#EF4444" }}>
                      {op.active!==false?"Activo":"Inactivo"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => { setViewing(op); setEditing(null); setShowForm(false); }} style={{ border:"none", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12, fontWeight:600, background:"#6366F122", color:"#6366F1" }}>👁️</button>
                      <button onClick={() => startEdit(op)} style={{ border:"none", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12, fontWeight:600, background:"#3B82F622", color:"#3B82F6" }}>✏️</button>
                      <button onClick={() => toggleActive(op)} style={{ border:"none", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12, fontWeight:600, background: op.active!==false?"#F59E0B22":"#10B98122", color: op.active!==false?"#F59E0B":"#10B981" }}>
                        {op.active!==false?"⏸":"▶️"}
                      </button>
                      <button onClick={() => { setSelected(new Set([op.id])); setConfirm(true); }} style={{ border:"none", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12, fontWeight:600, background:"#EF444422", color:"#EF4444" }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {ops.length===0 && <tr><td colSpan={8} style={{...s.td, textAlign:"center", color:"#6B7280"}}>No hay operadores registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Tabla super admins */}
      <div style={{ ...s.tableCard, marginTop:20 }}>
        <div style={{ color:"#F9FAFB", fontSize:15, fontWeight:700, marginBottom:16 }}>🛡 Super Administradores</div>
        <table style={s.table}>
          <thead>
            <tr>{["Nombre","Email","Zona","Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {admins.map(op => (
              <tr key={op.id} style={s.tr}>
                <td style={s.td}><strong>{op.displayName||"—"}</strong></td>
                <td style={s.td}>{op.email||"—"}</td>
                <td style={s.td}>{op.zone||"—"}</td>
                <td style={s.td}>
                  <button onClick={() => { setSelected(new Set([op.id])); setConfirm(true); }} style={{ border:"none", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600, background:"#EF444422", color:"#EF4444" }}>
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {admins.length===0 && <tr><td colSpan={4} style={{...s.td, textAlign:"center", color:"#6B7280"}}>No hay super admins</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  title:     { color:"#F9FAFB", fontSize:28, fontWeight:900, margin:0 },
  sub:       { color:"#6B7280", fontSize:14, margin:"4px 0 0" },
  btnPrimary:{ background:"#EF4444", color:"white", border:"none", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 },
  formCard:  { background:"#161b22", border:"1px solid #30363d", borderRadius:12, padding:24, marginBottom:24 },
  chartTitle:{ color:"#F9FAFB", fontSize:15, fontWeight:700, margin:"0 0 16px" },
  label:     { color:"#6B7280", fontSize:12, fontWeight:600 },
  input:     { background:"#0d1117", border:"1px solid #30363d", borderRadius:8, padding:"10px 14px", color:"#F9FAFB", fontSize:14 },
  tableCard: { background:"#161b22", border:"1px solid #21262d", borderRadius:12, padding:20 },
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { color:"#6B7280", fontSize:12, fontWeight:600, padding:"8px 12px", textAlign:"left", borderBottom:"1px solid #30363d" },
  tr:        { borderBottom:"1px solid #21262d" },
  td:        { color:"#F9FAFB", fontSize:13, padding:"12px" },
};