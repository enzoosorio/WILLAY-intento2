import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface Message { id: string; text: string; senderName: string; senderId: string; createdAt: any; type: "admin"|"operator"; }

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "admin_chat"), orderBy("createdAt", "asc"));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
    });
  }, []);

  async function send() {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "admin_chat"), {
        text:       input.trim(),
        senderName: "Super Admin",
        senderId:   auth.currentUser?.uid || "admin",
        type:       "admin",
        createdAt:  serverTimestamp(),
      });
      setInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(ts: any) {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit" });
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 64px)" }}>
      <div>
        <h1 style={{ color:"#F9FAFB", fontSize:28, fontWeight:900, margin:0 }}>Chat interno</h1>
        <p style={{ color:"#6B7280", fontSize:13, margin:"4px 0 24px" }}>Comunicación entre Super Admin y operadores</p>
      </div>

      {/* Mensajes */}
      <div style={{ flex:1, background:"#161b22", border:"1px solid #21262d", borderRadius:16, padding:20, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
        {messages.length === 0 && (
          <div style={{ color:"#6B7280", textAlign:"center", margin:"auto" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💬</div>
            <div>Sin mensajes aún. Inicia la conversación.</div>
          </div>
        )}
        {messages.map(m => {
          const isAdmin = m.type === "admin";
          return (
            <div key={m.id} style={{ display:"flex", flexDirection: isAdmin ? "row-reverse" : "row", alignItems:"flex-end", gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:16, background: isAdmin ? "#EF4444" : "#3B82F6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                {isAdmin ? "🛡" : "👮"}
              </div>
              <div style={{ maxWidth:"70%" }}>
                <div style={{ color:"#6B7280", fontSize:11, marginBottom:4, textAlign: isAdmin ? "right" : "left" }}>
                  {m.senderName} · {formatTime(m.createdAt)}
                </div>
                <div style={{
                  background: isAdmin ? "#EF444422" : "#3B82F622",
                  border: `1px solid ${isAdmin ? "#EF444444" : "#3B82F644"}`,
                  borderRadius: isAdmin ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding:"10px 14px", color:"#E5E7EB", fontSize:14, lineHeight:1.5,
                }}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display:"flex", gap:10 }}>
        <input
          style={{ flex:1, background:"#161b22", border:"1px solid #21262d", borderRadius:12, padding:"14px 18px", color:"#F9FAFB", fontSize:14, outline:"none" }}
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          background:"#EF4444", border:"none", borderRadius:12, padding:"14px 24px",
          color:"white", cursor:"pointer", fontWeight:700, fontSize:14,
          opacity: !input.trim() ? 0.4 : 1,
        }}>
          Enviar ➤
        </button>
      </div>
    </div>
  );
}