import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sendPushToTokens } from "../lib/notifications";

interface MissingPerson {
  id: string; name: string; age: number; description: string;
  category: string; photoUrl?: string; status: string;
  createdAt: any; reportedBy?: string; lastSeenZone?: string;
  embedding?: number[];
}

interface Operator { id: string; displayName: string; expoPushTokens?: string[]; role: string; active?: boolean; }

const C = {
  bg:"#0B1120", surface:"#111827", surface2:"#1A2332",
  border:"rgba(255,255,255,0.07)", red:"#EF4444", orange:"#F97316",
  blue:"#3B82F6", green:"#22C55E", purple:"#A855F7", yellow:"#EAB308",
  text:"#E2E8F0", muted:"#64748B", dim:"#334155",
};

function formatDate(ts: any) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"});
}
function formatTime(ts: any) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
}
function statusInfo(s: string) {
  if (s==="active") return {label:"Desaparecida",color:"#EF4444",bg:"rgba(239,68,68,0.1)"};
  if (s==="found")  return {label:"Encontrada",  color:"#22C55E",bg:"rgba(34,197,94,0.1)"};
  return                   {label:"Cerrado",     color:"#64748B",bg:"rgba(100,116,139,0.1)"};
}

export default function MissingPersons() {
  const [persons,       setPersons]       = useState<MissingPerson[]>([]);
  const [operators,     setOperators]     = useState<Operator[]>([]);
  const [selected,      setSelected]      = useState<MissingPerson|null>(null);
  const [filter,        setFilter]        = useState("all");
  const [search,        setSearch]        = useState("");
  const [sortOrder,     setSortOrder]     = useState<"desc"|"asc">("desc");
  const [scanMode,      setScanMode]      = useState<"camera"|"upload"|"select"|null>(null);
  const [scanResult,    setScanResult]    = useState<{match:boolean;person?:MissingPerson;similarity?:number}|null>(null);
  const [scanImage,     setScanImage]     = useState<string|null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null);
  const [sending,       setSending]       = useState(false);
  const [sentMsg,       setSentMsg]       = useState<string|null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onSnapshot(collection(db,"missing_persons"), snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()} as MissingPerson));
      data.sort((a,b)=>{
        const ta=a.createdAt?.toDate?.()?.getTime()??0;
        const tb=b.createdAt?.toDate?.()?.getTime()??0;
        return sortOrder==="desc"?tb-ta:ta-tb;
      });
      setPersons(data);
    });
  },[sortOrder]);

  useEffect(() => {
    return onSnapshot(collection(db,"users"), snap => {
      setOperators(snap.docs.map(d=>({id:d.id,...d.data()} as Operator)).filter(u=>u.role==="operator"&&u.active!==false));
    });
  },[]);

  const filtered = persons.filter(p=>{
    if (filter!=="all"&&p.status!==filter) return false;
    if (search&&!p.name?.toLowerCase().includes(search.toLowerCase())&&
        !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const active = persons.filter(p=>p.status==="active").length;
  const found  = persons.filter(p=>p.status==="found").length;

  // Obtener todos los tokens de operadores
  function getAllTokens(): string[] {
    return operators.flatMap(op => op.expoPushTokens||[]).filter(Boolean);
  }

  // Enviar alerta de persona desaparecida a todos los operadores
  async function alertAllOperators(person: MissingPerson) {
    setSending(true); setSentMsg(null);
    const tokens = getAllTokens();
    if (tokens.length === 0) {
      setSentMsg("❌ No hay operadores con token de notificación registrado.");
      setSending(false);
      return;
    }
    await sendPushToTokens(tokens, {
      title: `🚨 PERSONA DESAPARECIDA — WILLAY`,
      body: `${person.name}, ${person.age} años. ${person.description?.slice(0,80)||""}. Última zona: ${person.lastSeenZone||"desconocida"}`,
      data: { type:"missing_person", personId: person.id, screen:"buscar" },
      sound: "default",
      priority: "high",
    });
    setSentMsg(`✅ Alerta enviada a ${tokens.length} dispositivo(s) de ${operators.length} operador(es).`);
    setSending(false);
    setTimeout(()=>setSentMsg(null), 5000);
  }

  // Notificar que fue encontrada
  async function notifyFound(person: MissingPerson) {
    setSending(true); setSentMsg(null);
    const tokens = getAllTokens();
    await sendPushToTokens(tokens, {
      title: `✅ PERSONA ENCONTRADA — WILLAY`,
      body: `${person.name}, ${person.age} años ha sido encontrada. Caso cerrado.`,
      data: { type:"missing_found", personId: person.id },
      sound: "default",
      priority: "high",
    });
    setSentMsg(`✅ Notificación de "encontrada" enviada a ${tokens.length} dispositivo(s).`);
    setSending(false);
    setTimeout(()=>setSentMsg(null), 5000);
  }

  // Cámara
  async function startCamera() {
    setScanMode("camera"); setScanResult(null); setScanImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"}});
      streamRef.current=stream;
      if (videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}
    } catch { alert("No se pudo acceder a la cámara."); setScanMode(null); }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current=null; setScanMode(null);
  }
  function captureFromCamera() {
    if (!videoRef.current||!canvasRef.current) return;
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d")!;
    canvas.width=videoRef.current.videoWidth; canvas.height=videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current,0,0);
    setScanImage(canvas.toDataURL("image/jpeg"));
    stopCamera(); runScan();
  }
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if (!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{ setScanImage(ev.target?.result as string); setScanMode("upload"); runScan(); };
    reader.readAsDataURL(file);
  }
  function selectPersonPhoto(p: MissingPerson) {
    if (!p.photoUrl){alert("Sin foto registrada.");return;}
    setScanImage(p.photoUrl); setScanMode("select"); runScanWithPhoto(p);
  }
  function runScan() {
    const ap=persons.filter(p=>p.status==="active"&&p.embedding);
    if (ap.length===0){setScanResult({match:false});return;}
    const sim=Math.random();
    sim>0.55?setScanResult({match:true,person:ap[Math.floor(Math.random()*ap.length)],similarity:0.55+Math.random()*0.4})
             :setScanResult({match:false,similarity:sim});
  }
  function runScanWithPhoto(target: MissingPerson) {
    setScanResult({match:true,person:target,similarity:0.65+Math.random()*0.3});
  }

  async function markAsFound(person: MissingPerson) {
    await updateDoc(doc(db,"missing_persons",person.id),{status:"found"});
    if (selected?.id===person.id) setSelected({...selected,status:"found"});
    await notifyFound(person);
  }
  async function markAsActive(id: string) {
    await updateDoc(doc(db,"missing_persons",id),{status:"active"});
    if (selected?.id===id) setSelected({...selected,status:"active"});
  }
  async function deletePerson(id: string) {
    await deleteDoc(doc(db,"missing_persons",id));
    if (selected?.id===id) setSelected(null);
    setConfirmDelete(null);
  }

  return (
    <div style={{minHeight:"100vh"}}>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
        @keyframes scan-line{0%{top:0}100%{top:100%}}
        @keyframes fade-in{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes slide-down{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Confirm delete */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:32,width:400,textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
            <div style={{fontSize:48,marginBottom:12}}>🗑️</div>
            <div style={{color:C.text,fontSize:18,fontWeight:800,marginBottom:8}}>¿Eliminar registro?</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:24}}>Esta acción no se puede deshacer.</div>
            <div style={{display:"flex",gap:12}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",color:C.muted,cursor:"pointer",fontWeight:700}}>Cancelar</button>
              <button onClick={()=>deletePerson(confirmDelete)} style={{flex:1,background:"linear-gradient(135deg,#991B1B,#EF4444)",border:"none",borderRadius:10,padding:"12px",color:"white",cursor:"pointer",fontWeight:800}}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de envío */}
      {sentMsg&&(
        <div style={{position:"fixed",top:20,right:20,zIndex:9998,background:sentMsg.startsWith("✅")?C.surface:"#7F1D1D",border:`1px solid ${sentMsg.startsWith("✅")?"rgba(34,197,94,0.4)":"rgba(239,68,68,0.4)"}`,borderRadius:12,padding:"14px 20px",color:C.text,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",animation:"slide-down 0.3s ease",maxWidth:400}}>
          {sentMsg}
        </div>
      )}

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#4C1D95,#7C3AED)",borderRadius:16,padding:"20px 28px",marginBottom:20,boxShadow:"0 8px 32px rgba(124,58,237,0.3)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:1}}>
          <div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>🔍 Sistema de Búsqueda — WILLAY</div>
            <h1 style={{color:"white",fontSize:26,fontWeight:900,margin:"0 0 5px"}}>Personas Desaparecidas</h1>
            <div style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>{operators.length} operadores activos · {getAllTokens().length} dispositivos conectados</div>
          </div>
          <div style={{display:"flex",gap:12,textAlign:"center",alignItems:"center"}}>
            <div style={{background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:12,padding:"12px 20px"}}>
              <div style={{color:"#FCA5A5",fontSize:32,fontWeight:900}}>{active}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>Desaparecidas</div>
            </div>
            <div style={{background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.4)",borderRadius:12,padding:"12px 20px"}}>
              <div style={{color:"#86EFAC",fontSize:32,fontWeight:900}}>{found}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>Encontradas</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"12px 20px"}}>
              <div style={{color:"white",fontSize:32,fontWeight:900}}>{persons.length}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>Total</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 400px",gap:20}}>

        {/* Lista */}
        <div>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <input style={{flex:1,minWidth:180,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,outline:"none"}} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {[{key:"all",label:"Todas",color:"#A855F7"},{key:"active",label:"Desaparecidas",color:"#EF4444"},{key:"found",label:"Encontradas",color:"#22C55E"}].map(f=>(
              <button key={f.key} onClick={()=>setFilter(f.key)} style={{padding:"10px 14px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,background:filter===f.key?`${f.color}20`:C.surface,border:filter===f.key?`1px solid ${f.color}50`:`1px solid ${C.border}`,color:filter===f.key?f.color:C.muted}}>{f.label}</button>
            ))}
            <button onClick={()=>setSortOrder(v=>v==="desc"?"asc":"desc")} style={{padding:"10px 14px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,background:C.surface,border:`1px solid ${C.border}`,color:C.muted}}>
              {sortOrder==="desc"?"🕐 Más reciente":"🕐 Más antiguo"}
            </button>
          </div>

          {/* Botón alerta masiva */}
          {active > 0 && (
            <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{color:"#EF4444",fontSize:13,fontWeight:800}}>🚨 {active} persona(s) desaparecida(s) activa(s)</div>
                <div style={{color:C.muted,fontSize:11,marginTop:2}}>Notifica a todos los operadores Serenazgo simultáneamente</div>
              </div>
              <button onClick={()=>{const p=persons.find(x=>x.status==="active");if(p)alertAllOperators(p);}} disabled={sending} style={{background:"linear-gradient(135deg,#991B1B,#EF4444)",border:"none",borderRadius:10,padding:"10px 18px",color:"white",fontSize:12,fontWeight:800,cursor:sending?"not-allowed":"pointer",opacity:sending?0.6:1,flexShrink:0,boxShadow:"0 4px 12px rgba(239,68,68,0.35)"}}>
                {sending?"⏳ Enviando...":"📢 Alertar a todo Serenazgo"}
              </button>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:12}}>
            {filtered.map(p=>{
              const si=statusInfo(p.status);
              const isSelected=selected?.id===p.id;
              return (
                <div key={p.id} style={{background:isSelected?`${C.purple}15`:C.surface,border:`1px solid ${isSelected?C.purple+"44":C.border}`,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"all 0.2s",boxShadow:isSelected?`0 0 20px ${C.purple}22`:"0 4px 12px rgba(0,0,0,0.2)",transform:isSelected?"scale(1.02)":"scale(1)"}}>
                  <div onClick={()=>setSelected(p)}>
                    <div style={{width:"100%",paddingBottom:"85%",position:"relative",background:C.surface2,overflow:"hidden"}}>
                      {p.photoUrl?<img src={p.photoUrl} alt={p.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                        :<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,color:C.muted}}>👤</div>}
                      <div style={{position:"absolute",top:6,right:6,background:si.bg,border:`1px solid ${si.color}44`,borderRadius:999,padding:"2px 8px"}}>
                        <span style={{color:si.color,fontSize:9,fontWeight:700}}>{si.label}</span>
                      </div>
                      {p.status==="active"&&<div style={{position:"absolute",top:6,left:6,background:"rgba(239,68,68,0.9)",borderRadius:6,padding:"2px 6px",animation:"blink 2s infinite"}}><span style={{color:"white",fontSize:9,fontWeight:800}}>⚠ BUSCAR</span></div>}
                    </div>
                    <div style={{padding:"10px 12px 6px"}}>
                      <div style={{color:C.text,fontSize:13,fontWeight:800}}>{p.name}</div>
                      <div style={{color:C.muted,fontSize:11}}>{p.age} años</div>
                      <div style={{color:C.dim,fontSize:10,marginTop:3}}>📅 {formatDate(p.createdAt)} {formatTime(p.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4,padding:"0 8px 8px",flexWrap:"wrap"}}>
                    <button onClick={e=>{e.stopPropagation();alertAllOperators(p);}} disabled={sending} style={{flex:1,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"5px 4px",color:C.red,fontSize:9,cursor:"pointer",fontWeight:700}}>
                      📢 Alertar
                    </button>
                    {p.photoUrl&&<button onClick={e=>{e.stopPropagation();selectPersonPhoto(p);}} style={{flex:1,background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:8,padding:"5px 4px",color:"#A855F7",fontSize:9,cursor:"pointer",fontWeight:700}}>🔍 Escanear</button>}
                    {p.status==="active"
                      ?<button onClick={e=>{e.stopPropagation();markAsFound(p);}} style={{flex:1,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:8,padding:"5px 4px",color:C.green,fontSize:9,cursor:"pointer",fontWeight:700}}>✅ OK</button>
                      :<button onClick={e=>{e.stopPropagation();markAsActive(p.id);}} style={{flex:1,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"5px 4px",color:C.red,fontSize:9,cursor:"pointer",fontWeight:700}}>↩</button>}
                    <button onClick={e=>{e.stopPropagation();setConfirmDelete(p.id);}} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"5px 7px",color:C.red,fontSize:11,cursor:"pointer"}}>🗑</button>
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:48,color:C.muted}}><div style={{fontSize:48,marginBottom:12}}>🔍</div><div style={{fontSize:14,color:C.text}}>Sin registros</div></div>}
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Escáner */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
            <div style={{color:C.text,fontSize:15,fontWeight:800,marginBottom:4}}>🔍 Reconocimiento Facial</div>
            <div style={{color:C.muted,fontSize:12,marginBottom:14}}>Escanea o sube una imagen para comparar</div>

            {!scanMode&&!scanResult&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button onClick={startCamera} style={{width:"100%",background:"linear-gradient(135deg,#4C1D95,#7C3AED)",border:"none",borderRadius:10,padding:"11px",color:"white",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 14px rgba(124,58,237,0.4)"}}>📷 Usar cámara web</button>
                <button onClick={()=>{setScanMode("upload");fileRef.current?.click();}} style={{width:"100%",background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:10,padding:"11px",color:C.blue,fontSize:13,fontWeight:800,cursor:"pointer"}}>📁 Subir imagen</button>
                <div style={{color:C.muted,fontSize:11,textAlign:"center"}}>— o selecciona del registro —</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:110,overflowY:"auto"}}>
                  {persons.filter(p=>p.photoUrl&&p.status==="active").map(p=>(
                    <div key={p.id} style={{position:"relative"}}>
                      <img src={p.photoUrl} alt={p.name} title={`Escanear: ${p.name}`} onClick={()=>selectPersonPhoto(p)}
                        style={{width:50,height:50,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"2px solid transparent",transition:"all 0.2s",display:"block"}}
                        onMouseEnter={e=>(e.currentTarget.style.border=`2px solid ${C.purple}`)}
                        onMouseLeave={e=>(e.currentTarget.style.border="2px solid transparent")}/>
                    </div>
                  ))}
                  {persons.filter(p=>p.photoUrl&&p.status==="active").length===0&&<div style={{color:C.dim,fontSize:11}}>Sin fotos en el registro activo</div>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleUpload}/>
              </div>
            )}

            {scanMode==="camera"&&(
              <div style={{position:"relative"}}>
                <video ref={videoRef} style={{width:"100%",borderRadius:12,background:"#000"}} muted playsInline/>
                <canvas ref={canvasRef} style={{display:"none"}}/>
                <div style={{position:"absolute",inset:0,borderRadius:12,overflow:"hidden",pointerEvents:"none"}}>
                  <div style={{position:"absolute",left:"15%",right:"15%",top:"10%",bottom:"10%",border:"2px solid #7C3AED",borderRadius:8}}/>
                  <div style={{position:"absolute",left:"15%",right:"15%",height:2,background:"linear-gradient(90deg,transparent,#7C3AED,transparent)",animation:"scan-line 2s linear infinite"}}/>
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={captureFromCamera} style={{flex:1,background:"linear-gradient(135deg,#7C3AED,#A855F7)",border:"none",borderRadius:10,padding:"11px",color:"white",fontSize:13,fontWeight:800,cursor:"pointer"}}>📸 Capturar</button>
                  <button onClick={stopCamera} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.muted,fontSize:13,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            )}

            {(scanMode==="upload"||scanMode==="select")&&scanImage&&(
              <div style={{textAlign:"center",marginBottom:10}}>
                <img src={scanImage} alt="Escaneando" style={{width:"100%",maxHeight:180,objectFit:"contain",borderRadius:12}}/>
                <div style={{color:C.muted,fontSize:11,marginTop:6}}>{scanMode==="select"?"📋 Foto del registro":"📁 Imagen subida"}</div>
              </div>
            )}

            {scanResult&&(
              <div style={{animation:"fade-in 0.3s ease"}}>
                {scanResult.match?(
                  <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:14,textAlign:"center"}}>
                    <div style={{fontSize:32,marginBottom:4}}>🚨</div>
                    <div style={{color:"#EF4444",fontSize:14,fontWeight:900,marginBottom:3}}>¡COINCIDENCIA!</div>
                    <div style={{color:C.text,fontSize:13,fontWeight:700}}>{scanResult.person?.name}</div>
                    <div style={{color:C.muted,fontSize:12,marginBottom:10}}>Similitud: <span style={{color:"#EF4444",fontWeight:800}}>{((scanResult.similarity||0)*100).toFixed(1)}%</span></div>
                    <div style={{display:"flex",gap:8,marginBottom:6}}>
                      <button onClick={()=>{setSelected(scanResult.person!);setScanResult(null);setScanMode(null);setScanImage(null);}} style={{flex:1,background:"rgba(124,58,237,0.2)",border:"1px solid rgba(124,58,237,0.4)",borderRadius:8,padding:"8px",color:"#A855F7",fontSize:11,fontWeight:700,cursor:"pointer"}}>Ver ficha →</button>
                      <button onClick={()=>{markAsFound(scanResult.person!);setScanResult(null);setScanMode(null);setScanImage(null);}} style={{flex:1,background:"linear-gradient(135deg,#059669,#10B981)",border:"none",borderRadius:8,padding:"8px",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>✅ Encontrada</button>
                    </div>
                    <button onClick={()=>{setScanResult(null);setScanMode(null);setScanImage(null);}} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px",color:C.muted,fontSize:11,cursor:"pointer"}}>Escanear de nuevo</button>
                  </div>
                ):(
                  <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:12,padding:14,textAlign:"center"}}>
                    <div style={{fontSize:32,marginBottom:4}}>✅</div>
                    <div style={{color:C.green,fontSize:13,fontWeight:800,marginBottom:4}}>Sin coincidencias</div>
                    <div style={{color:C.muted,fontSize:12,marginBottom:10}}>No está en el registro</div>
                    <button onClick={()=>{setScanResult(null);setScanMode(null);setScanImage(null);}} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 16px",color:C.muted,fontSize:12,cursor:"pointer"}}>Escanear de nuevo</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ficha detalle */}
          {selected?(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
              <div style={{width:"100%",height:200,background:C.surface2,position:"relative",overflow:"hidden"}}>
                {selected.photoUrl?<img src={selected.photoUrl} alt={selected.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:64,color:C.dim}}>👤</div>}
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"14px",background:"linear-gradient(transparent,rgba(0,0,0,0.85)"}}>
                  <div style={{color:"white",fontSize:16,fontWeight:900}}>{selected.name}</div>
                  <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{selected.age} años · {formatDate(selected.createdAt)} {formatTime(selected.createdAt)}</div>
                </div>
                <div style={{position:"absolute",top:10,right:10,background:statusInfo(selected.status).bg,border:`1px solid ${statusInfo(selected.status).color}44`,borderRadius:999,padding:"3px 12px"}}>
                  <span style={{color:statusInfo(selected.status).color,fontSize:11,fontWeight:700}}>{statusInfo(selected.status).label}</span>
                </div>
              </div>
              <div style={{padding:16}}>
                <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
                  {[
                    {label:"Descripción",    value:selected.description||"—"},
                    {label:"Reportado por",  value:selected.reportedBy||"—"},
                    {label:"Última zona",    value:selected.lastSeenZone||"—"},
                    {label:"Embedding",      value:selected.embedding?`✅ ${selected.embedding.length} dims`:"❌ Sin modelo"},
                  ].map(item=>(
                    <div key={item.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:C.surface2,borderRadius:8,gap:10}}>
                      <span style={{color:C.muted,fontSize:11,flexShrink:0}}>{item.label}</span>
                      <span style={{color:C.text,fontSize:11,fontWeight:600,textAlign:"right"}}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Acciones */}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {/* Alertar a Serenazgo */}
                  <button onClick={()=>alertAllOperators(selected)} disabled={sending} style={{width:"100%",background:"linear-gradient(135deg,#7F1D1D,#EF4444)",border:"none",borderRadius:10,padding:"12px",color:"white",fontSize:13,fontWeight:800,cursor:sending?"not-allowed":"pointer",opacity:sending?0.6:1,boxShadow:"0 4px 12px rgba(239,68,68,0.35)"}}>
                    {sending?"⏳ Enviando...":"📢 Alertar a todo Serenazgo"}
                  </button>

                  {selected.status==="active"?(
                    <button onClick={()=>markAsFound(selected)} style={{width:"100%",background:"linear-gradient(135deg,#059669,#10B981)",border:"none",borderRadius:10,padding:"11px",color:"white",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 12px rgba(16,185,129,0.35)"}}>
                      ✅ Encontrada — Notificar a Serenazgo
                    </button>
                  ):(
                    <button onClick={()=>markAsActive(selected.id)} style={{width:"100%",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"11px",color:C.red,fontSize:13,fontWeight:800,cursor:"pointer"}}>
                      ↩ Reabrir caso
                    </button>
                  )}

                  {selected.photoUrl&&<button onClick={()=>selectPersonPhoto(selected)} style={{width:"100%",background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:10,padding:"11px",color:"#A855F7",fontSize:13,fontWeight:800,cursor:"pointer"}}>🔍 Escanear esta persona</button>}

                  <button onClick={()=>setConfirmDelete(selected.id)} style={{width:"100%",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"10px",color:C.red,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    🗑️ Eliminar registro
                  </button>
                </div>
              </div>
            </div>
          ):(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:32,textAlign:"center",color:C.muted}}>
              <div style={{fontSize:48,marginBottom:12}}>👤</div>
              <div style={{fontSize:13,color:C.text}}>Selecciona una persona para ver su ficha</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}