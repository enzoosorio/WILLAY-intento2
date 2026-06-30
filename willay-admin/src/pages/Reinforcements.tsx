import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";

interface ReinforcementRequest {
  id: string; reportId: string; type: string; typeLabel: string;
  requestedBy: string; requestedByZone: string;
  location?: { latitude: number; longitude: number };
  reportText: string; reportPriority: string;
  status: string; createdAt: any;
  resolution?: string;
}

const C = {
  bg:"#0B1120", surface:"#111827", surface2:"#1A2332",
  border:"rgba(255,255,255,0.07)", red:"#EF4444", orange:"#F97316",
  blue:"#3B82F6", green:"#22C55E", purple:"#A855F7", yellow:"#EAB308",
  text:"#E2E8F0", muted:"#64748B", dim:"#334155",
};

const TYPE_COLORS: Record<string,{color:string;icon:string}> = {
  ambulance:    { color:"#22C55E", icon:"🚑" },
  firefighters: { color:"#F97316", icon:"🚒" },
  police:       { color:"#3B82F6", icon:"👮" },
  serenazgo:    { color:"#EF4444", icon:"🚔" },
};

function formatTime(ts: any) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
}
function formatDate(ts: any) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleDateString("es-PE",{day:"2-digit",month:"short"});
}
function timeAgo(ts: any) {
  if (!ts?.toDate) return "—";
  const m = Math.floor((Date.now()-ts.toDate().getTime())/60000);
  if (m<1) return "Ahora mismo";
  if (m<60) return `Hace ${m} min`;
  const h = Math.floor(m/60);
  return `Hace ${h}h`;
}

function statusInfo(s: string) {
  if (s==="pending")    return { label:"Pendiente",       color:"#EAB308", bg:"rgba(234,179,8,0.1)" };
  if (s==="dispatched") return { label:"En camino",        color:"#3B82F6", bg:"rgba(59,130,246,0.1)" };
  if (s==="confirmed")  return { label:"Confirmado real",  color:"#EF4444", bg:"rgba(239,68,68,0.1)" };
  if (s==="false_alarm")return { label:"Falsa alarma",     color:"#64748B", bg:"rgba(100,116,139,0.1)" };
  if (s==="resolved")   return { label:"Resuelto",         color:"#22C55E", bg:"rgba(34,197,94,0.1)" };
  return                       { label:s,                  color:"#64748B", bg:"rgba(100,116,139,0.1)" };
}

export default function Reinforcements() {
  const [requests, setRequests] = useState<ReinforcementRequest[]>([]);
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState<ReinforcementRequest|null>(null);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db,"reinforcement_requests"), orderBy("createdAt","desc"));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()} as ReinforcementRequest));
      setRequests(data);
    });
  },[]);

  const filtered = requests.filter(r => {
    if (filter==="all") return true;
    if (filter==="active") return r.status==="pending"||r.status==="dispatched";
    return r.status===filter;
  });

  const pending = requests.filter(r=>r.status==="pending").length;
  const dispatched = requests.filter(r=>r.status==="dispatched").length;
  const confirmed = requests.filter(r=>r.status==="confirmed").length;
  const falseAlarms = requests.filter(r=>r.status==="false_alarm").length;

  async function updateStatus(id: string, status: string) {
    await updateDoc(doc(db,"reinforcement_requests",id),{status});
    if (selected?.id===id) setSelected({...selected,status});
  }

  return (
    <div style={{minHeight:"100vh"}}>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#7c2d12,#EA580C,#F97316)",borderRadius:16,padding:"20px 28px",marginBottom:20,boxShadow:"0 8px 32px rgba(234,88,12,0.3)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:1}}>
          <div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>🚨 Coordinación de Emergencias</div>
            <h1 style={{color:"white",fontSize:26,fontWeight:900,margin:"0 0 5px"}}>Solicitudes de Refuerzo</h1>
            <div style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>Verificación en campo por Serenazgo</div>
          </div>
          <div style={{display:"flex",gap:12,textAlign:"center"}}>
            <div style={{background:"rgba(234,179,8,0.25)",border:"1px solid rgba(234,179,8,0.4)",borderRadius:12,padding:"10px 18px"}}>
              <div style={{color:"#FDE047",fontSize:28,fontWeight:900}}>{pending}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>Pendientes</div>
            </div>
            <div style={{background:"rgba(59,130,246,0.25)",border:"1px solid rgba(59,130,246,0.4)",borderRadius:12,padding:"10px 18px"}}>
              <div style={{color:"#93C5FD",fontSize:28,fontWeight:900}}>{dispatched}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>En camino</div>
            </div>
            <div style={{background:"rgba(239,68,68,0.25)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:12,padding:"10px 18px"}}>
              <div style={{color:"#FCA5A5",fontSize:28,fontWeight:900}}>{confirmed}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>Confirmados</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"10px 18px"}}>
              <div style={{color:"white",fontSize:28,fontWeight:900}}>{falseAlarms}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>Falsas alarmas</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20}}>

        {/* Lista */}
        <div>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {[
              {key:"all",label:"Todas",color:"#A855F7"},
              {key:"active",label:"Activas",color:"#EAB308"},
              {key:"confirmed",label:"Confirmadas",color:"#EF4444"},
              {key:"false_alarm",label:"Falsas alarmas",color:"#64748B"},
              {key:"resolved",label:"Resueltas",color:"#22C55E"},
            ].map(f=>(
              <button key={f.key} onClick={()=>setFilter(f.key)} style={{padding:"9px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,background:filter===f.key?`${f.color}20`:C.surface,border:filter===f.key?`1px solid ${f.color}50`:`1px solid ${C.border}`,color:filter===f.key?f.color:C.muted}}>{f.label}</button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.length===0&&(
              <div style={{textAlign:"center",padding:48,color:C.muted,background:C.surface,borderRadius:16,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:48,marginBottom:12}}>📋</div>
                <div style={{fontSize:14,color:C.text}}>Sin solicitudes de refuerzo</div>
              </div>
            )}
            {filtered.map(r=>{
              const tc = TYPE_COLORS[r.type] || {color:C.muted,icon:"📍"};
              const si = statusInfo(r.status);
              const isSelected = selected?.id===r.id;
              const isPending = r.status==="pending";
              return (
                <div key={r.id} onClick={()=>setSelected(r)} style={{
                  background: isSelected?`${tc.color}10`:C.surface,
                  border:`1px solid ${isSelected?tc.color+"44":C.border}`,
                  borderLeft:`4px solid ${tc.color}`,
                  borderRadius:14, padding:16, cursor:"pointer",
                  boxShadow: isPending ? `0 0 16px ${tc.color}15` : "none",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:36,height:36,borderRadius:10,background:`${tc.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{tc.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontSize:14,fontWeight:800}}>{r.typeLabel}</div>
                      <div style={{color:C.muted,fontSize:11}}>Solicitado por {r.requestedBy} · {r.requestedByZone}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{background:si.bg,border:`1px solid ${si.color}44`,borderRadius:999,padding:"3px 10px",marginBottom:4}}>
                        <span style={{color:si.color,fontSize:10,fontWeight:700}}>{si.label}</span>
                      </div>
                      <div style={{color:C.dim,fontSize:10}}>{timeAgo(r.createdAt)}</div>
                    </div>
                  </div>
                  {r.reportText&&<div style={{color:C.muted,fontSize:12,marginBottom:8,paddingLeft:46}}>{r.reportText.slice(0,90)}</div>}
                  {isPending&&(
                    <div style={{display:"flex",gap:8,paddingLeft:46}}>
                      <button onClick={e=>{e.stopPropagation();updateStatus(r.id,"dispatched");}} style={{flex:1,background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:8,padding:"7px",color:"#3B82F6",fontSize:11,fontWeight:700,cursor:"pointer"}}>🚓 Marcar en camino</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel detalle */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {selected?(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${TYPE_COLORS[selected.type]?.color||C.muted}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                  {TYPE_COLORS[selected.type]?.icon||"📍"}
                </div>
                <div>
                  <div style={{color:C.text,fontSize:16,fontWeight:900}}>{selected.typeLabel}</div>
                  <div style={{color:C.muted,fontSize:12}}>{formatDate(selected.createdAt)} · {formatTime(selected.createdAt)}</div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                {[
                  {label:"Solicitado por",value:selected.requestedBy},
                  {label:"Zona",value:selected.requestedByZone},
                  {label:"Prioridad reporte",value:selected.reportPriority},
                  {label:"Descripción",value:selected.reportText||"—"},
                ].map(item=>(
                  <div key={item.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:C.surface2,borderRadius:8,gap:10}}>
                    <span style={{color:C.muted,fontSize:11,flexShrink:0}}>{item.label}</span>
                    <span style={{color:C.text,fontSize:11,fontWeight:600,textAlign:"right"}}>{item.value}</span>
                  </div>
                ))}
              </div>

              {selected.location?.latitude&&(
                <button onClick={()=>window.open(`https://www.google.com/maps?q=${selected.location!.latitude},${selected.location!.longitude}&z=17`,"_blank")} style={{width:"100%",background:"linear-gradient(135deg,#1e3a5f,#3B82F6)",border:"none",borderRadius:10,padding:"12px",color:"white",fontSize:13,fontWeight:800,cursor:"pointer",marginBottom:12}}>
                  🗺️ Ver ubicación exacta
                </button>
              )}

              <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>
                Verificación de Serenazgo en campo
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button onClick={()=>updateStatus(selected.id,"confirmed")} disabled={selected.status==="confirmed"} style={{width:"100%",background:selected.status==="confirmed"?"rgba(239,68,68,0.1)":"linear-gradient(135deg,#991B1B,#EF4444)",border:selected.status==="confirmed"?"1px solid rgba(239,68,68,0.3)":"none",borderRadius:10,padding:"12px",color:selected.status==="confirmed"?"#EF4444":"white",fontSize:13,fontWeight:800,cursor:selected.status==="confirmed"?"default":"pointer",opacity:selected.status==="confirmed"?0.6:1}}>
                  ⚠️ Confirmado — Es real
                </button>
                <button onClick={()=>updateStatus(selected.id,"false_alarm")} disabled={selected.status==="false_alarm"} style={{width:"100%",background:selected.status==="false_alarm"?"rgba(100,116,139,0.1)":C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",color:selected.status==="false_alarm"?C.dim:C.muted,fontSize:13,fontWeight:700,cursor:selected.status==="false_alarm"?"default":"pointer",opacity:selected.status==="false_alarm"?0.6:1}}>
                  ❌ Falsa alarma
                </button>
                <button onClick={()=>updateStatus(selected.id,"resolved")} disabled={selected.status==="resolved"} style={{width:"100%",background:selected.status==="resolved"?"rgba(34,197,94,0.1)":"linear-gradient(135deg,#059669,#10B981)",border:selected.status==="resolved"?"1px solid rgba(34,197,94,0.3)":"none",borderRadius:10,padding:"12px",color:selected.status==="resolved"?"#22C55E":"white",fontSize:13,fontWeight:800,cursor:selected.status==="resolved"?"default":"pointer",opacity:selected.status==="resolved"?0.6:1}}>
                  ✅ Caso resuelto
                </button>
              </div>
            </div>
          ):(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:32,textAlign:"center",color:C.muted}}>
              <div style={{fontSize:48,marginBottom:12}}>🚨</div>
              <div style={{fontSize:13,color:C.text}}>Selecciona una solicitud para ver el detalle</div>
            </div>
          )}

          {/* Info */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:18}}>
            <div style={{color:C.text,fontSize:13,fontWeight:800,marginBottom:10}}>📋 Flujo de verificación</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {step:"1",text:"Operador solicita refuerzo desde campo",color:"#EAB308"},
                {step:"2",text:"Super Admin marca 'en camino' si corresponde",color:"#3B82F6"},
                {step:"3",text:"Tras verificación: confirmado o falsa alarma",color:"#EF4444"},
                {step:"4",text:"Se cierra el caso cuando se resuelve",color:"#22C55E"},
              ].map(item=>(
                <div key={item.step} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:22,height:22,borderRadius:11,background:`${item.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:item.color,flexShrink:0}}>{item.step}</div>
                  <span style={{color:C.muted,fontSize:11}}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}