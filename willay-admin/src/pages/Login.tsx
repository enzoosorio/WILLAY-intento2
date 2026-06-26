import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
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
      setError("Credenciales incorrectas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>🛡</div>
        <h1 style={styles.title}>WILLAY</h1>
        <p style={styles.sub}>Torre de Control — Super Admin</p>
        <form onSubmit={handleLogin} style={styles.form}>
          <input style={styles.input} type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar al sistema"}
          </button>
        </form>
        <p style={styles.footer}>Serenazgo Puente Piedra © 2026</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg:     { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117" },
  card:   { background: "#161b22", border: "1px solid #30363d", borderRadius: 16, padding: "48px 40px", width: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  logo:   { fontSize: 56 },
  title:  { color: "#E53E3E", margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: 2 },
  sub:    { color: "#8b949e", margin: 0, fontSize: 13 },
  form:   { width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 16 },
  input:  { background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: "12px 16px", color: "#e6edf3", fontSize: 15, outline: "none" },
  error:  { color: "#E53E3E", fontSize: 13, margin: 0 },
  btn:    { background: "#E53E3E", color: "white", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  footer: { color: "#484f58", fontSize: 12, marginTop: 8 },
};