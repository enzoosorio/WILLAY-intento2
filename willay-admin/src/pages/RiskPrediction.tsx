import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { askGroq } from "../lib/groq";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

interface Report {
  id: string; priority: string; status: string; zone: string;
  type: string; categoryLabel: string; createdAt: any;
}

const C = {
  bg:"#0B1120", surface:"#111827", surface2:"#1A2332",
  border:"rgba(255,255,255,0.07)", red:"#EF4444", orange:"#F97316",
  blue:"#3B82F6", green:"#22C55E", purple:"#A855F7", yellow:"#EAB308",
  text:"#E2E8F0", muted:"#64748B", dim:"#334155",
};

interface ZoneRisk {
  zone: string;
  total: number;
  p1: number;
  thisWeek: number;
  lastWeek: number;
  trend: "up" | "down" | "stable";
  trendPct: number;
  riskLevel: "alto" | "medio" | "bajo";
  riskScore: number;
}

function calcRiskLevel(score: number): "alto"|"medio"|"bajo" {
  if (score >= 60) return "alto";
  if (score >= 30) return "medio";
  return "bajo";
}
function riskColor(level: string) {
  if (level==="alto") return C.red;
  if (level==="medio") return C.orange;
  return C.green;
}

export default function RiskPrediction() {
  const [reports,    setReports]    = useState<Report[]>([]);
  const [zoneRisks,  setZoneRisks]  = useState<ZoneRisk[]>([]);
  const [analysis,   setAnalysis]   = useState<string>("");
  const [loadingAI,  setLoadingAI]  = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db,"reports"), snap => {
      setReports(snap.docs.map(d=>({id:d.id,...d.data()} as Report)));
    });
  },[]);

  useEffect(() => {
    if (reports.length === 0) return;

    const now = Date.now();
    const oneWeek = 7*24*60*60*1000;

    const zoneMap: Record<string, { total:number; p1:number; thisWeek:number; lastWeek:number }> = {};

    reports.forEach(r => {
      const zone = (r as any).zone || "otros";
      if (!zoneMap[zone]) zoneMap[zone] = { total:0, p1:0, thisWeek:0, lastWeek:0 };
      zoneMap[zone].total++;
      if (r.priority === "P1") zoneMap[zone].p1++;

      const ts = r.createdAt?.toDate?.()?.getTime();
      if (ts) {
        const diff = now - ts;
        if (diff <= oneWeek) zoneMap[zone].thisWeek++;
        else if (diff <= oneWeek*2) zoneMap[zone].lastWeek++;
      }
    });

    const risks: ZoneRisk[] = Object.entries(zoneMap).map(([zone, data]) => {
      const trendPct = data.lastWeek > 0
        ? Math.round(((data.thisWeek - data.lastWeek) / data.lastWeek) * 100)
        : data.thisWeek > 0 ? 100 : 0;
      const trend = trendPct > 10 ? "up" : trendPct < -10 ? "down" : "stable";

      // Score de riesgo: combina total, P1, y tendencia reciente
      const riskScore = Math.min(100, Math.round(
        (data.total * 3) + (data.p1 * 8) + (data.thisWeek * 5) + (trend==="up" ? 15 : 0)
      ));

      return {
        zone, total:data.total, p1:data.p1,
        thisWeek:data.thisWeek, lastWeek:data.lastWeek,
        trend, trendPct,
        riskLevel: calcRiskLevel(riskScore),
        riskScore,
      };
    }).sort((a,b) => b.riskScore - a.riskScore);

    setZoneRisks(risks);
  },[reports]);

  async function generateAIAnalysis() {
    setLoadingAI(true);
    setHasGenerated(true);
    try {
      const topZones = zoneRisks.slice(0,5);
      const dataResume = topZones.map(z =>
        `${z.zone}: ${z.total} reportes totales, ${z.p1} críticos (P1), ${z.thisWeek} esta semana vs ${z.lastWeek} semana pasada (tendencia ${z.trend==="up"?"subiendo":z.trend==="down"?"bajando":"estable"} ${z.trendPct}%), nivel de riesgo: ${z.riskLevel}`
      ).join("\n");

      const systemPrompt = `Eres un analista de seguridad ciudadana para el distrito de Puente Piedra, Lima, Perú. Trabajas para el sistema WILLAY de Serenazgo. El distrito se divide en 3 zonas con 17 sectores oficiales: ZONA SUR (La Ensenada, Laderas, Chillón, Shangri-La), ZONA CENTRO (Tambo Inga Oeste, Tambo Inga Este, Pampa Libre, Gallinazos, Santa Rosa, Cercado, Las Vegas, La Grama, Copacabana), ZONA NORTE (El Dorado, Leoncio Prado, Jerusalén, Lomas). Analiza datos de incidencias y da recomendaciones concretas y accionables de patrullaje en español, de forma profesional pero directa. Máximo 220 palabras. No uses markdown ni asteriscos, solo texto plano con saltos de línea.`;

      const userPrompt = `Aquí están los datos de incidencias por zona en Puente Piedra de las últimas 2 semanas:

${dataResume}

Total de reportes en el sistema: ${reports.length}
Reportes críticos P1 totales: ${reports.filter(r=>r.priority==="P1").length}

Dame un análisis breve de las zonas de mayor riesgo, identifica patrones, y da 2-3 recomendaciones concretas de patrullaje preventivo (qué zonas reforzar, en qué horarios aproximados si es posible inferirlo, y qué tipo de respuesta priorizar).`;

      const result = await askGroq(systemPrompt, userPrompt);
      setAnalysis(result);
    } finally {
      setLoadingAI(false);
    }
  }

  const totalP1 = reports.filter(r=>r.priority==="P1").length;
  const highRiskZones = zoneRisks.filter(z=>z.riskLevel==="alto").length;

  return (
    <div style={{minHeight:"100vh"}}>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#4C1D95,#7C3AED)",borderRadius:16,padding:"20px 28px",marginBottom:20,boxShadow:"0 8px 32px rgba(124,58,237,0.3)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:1}}>
          <div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>🧠 Inteligencia Artificial — WILLAY</div>
            <h1 style={{color:"white",fontSize:26,fontWeight:900,margin:"0 0 5px"}}>Predicción de Zonas de Riesgo</h1>
            <div style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>Análisis predictivo basado en historial de incidencias</div>
          </div>
          <div style={{display:"flex",gap:12,textAlign:"center"}}>
            <div style={{background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:12,padding:"12px 20px"}}>
              <div style={{color:"#FCA5A5",fontSize:28,fontWeight:900}}>{highRiskZones}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>Zonas alto riesgo</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"12px 20px"}}>
              <div style={{color:"white",fontSize:28,fontWeight:900}}>{totalP1}</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>P1 totales</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 420px",gap:20}}>

        {/* Ranking de zonas */}
        <div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
            <div style={{color:C.text,fontSize:15,fontWeight:800,marginBottom:14}}>📊 Ranking de riesgo por zona</div>
            {zoneRisks.length === 0 ? (
              <div style={{color:C.muted,textAlign:"center",padding:24}}>Sin datos suficientes aún</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={zoneRisks} layout="vertical" margin={{left:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.surface2} horizontal={false}/>
                  <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="zone" tick={{fill:C.text,fontSize:12}} axisLine={false} tickLine={false} width={100}/>
                  <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,fontSize:12}}/>
                  <Bar dataKey="riskScore" radius={[0,6,6,0]} barSize={22}>
                    {zoneRisks.map((z,i)=><Cell key={i} fill={riskColor(z.riskLevel)}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tarjetas detalle por zona */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {zoneRisks.map(z=>{
              const rc = riskColor(z.riskLevel);
              return (
                <div key={z.zone} style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`4px solid ${rc}`,borderRadius:14,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:10,background:`${rc}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                        {z.riskLevel==="alto"?"🔴":z.riskLevel==="medio"?"🟡":"🟢"}
                      </div>
                      <div>
                        <div style={{color:C.text,fontSize:14,fontWeight:800,textTransform:"capitalize"}}>{z.zone.replace("_"," ")}</div>
                        <div style={{color:C.muted,fontSize:11}}>{z.total} reportes totales · {z.p1} críticos</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{background:`${rc}22`,border:`1px solid ${rc}44`,borderRadius:999,padding:"4px 12px"}}>
                        <span style={{color:rc,fontSize:11,fontWeight:800,textTransform:"uppercase"}}>{z.riskLevel}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface2,borderRadius:10,padding:"8px 12px"}}>
                    <span style={{color:C.muted,fontSize:11}}>Esta semana: <strong style={{color:C.text}}>{z.thisWeek}</strong> vs anterior: <strong style={{color:C.text}}>{z.lastWeek}</strong></span>
                    <span style={{color: z.trend==="up"?C.red:z.trend==="down"?C.green:C.muted, fontSize:12, fontWeight:800}}>
                      {z.trend==="up"?"↑":z.trend==="down"?"↓":"→"} {Math.abs(z.trendPct)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de IA */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#7C3AED,#A855F7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🧠</div>
              <div style={{color:C.text,fontSize:15,fontWeight:800}}>Análisis con IA</div>
            </div>
            <div style={{color:C.muted,fontSize:12,marginBottom:16}}>Recomendaciones de patrullaje generadas automáticamente</div>

            {!hasGenerated && (
              <button onClick={generateAIAnalysis} disabled={zoneRisks.length===0} style={{
                width:"100%", background: zoneRisks.length===0 ? C.surface2 : "linear-gradient(135deg,#4C1D95,#7C3AED)",
                border:"none", borderRadius:12, padding:"14px",
                color: zoneRisks.length===0 ? C.muted : "white",
                fontSize:14, fontWeight:800, cursor: zoneRisks.length===0?"not-allowed":"pointer",
                boxShadow: zoneRisks.length===0 ? "none" : "0 4px 16px rgba(124,58,237,0.4)",
              }}>
                ✨ Generar análisis predictivo
              </button>
            )}

            {loadingAI && (
              <div style={{textAlign:"center",padding:32}}>
                <div style={{fontSize:32,display:"inline-block",animation:"spin 1.5s linear infinite"}}>🧠</div>
                <div style={{color:C.muted,fontSize:13,marginTop:10}}>Analizando patrones de riesgo...</div>
              </div>
            )}

            {analysis && !loadingAI && (
              <div style={{animation:"fade-in 0.4s ease"}}>
                <div style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,padding:16,marginBottom:12}}>
                  <div style={{color:C.text,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{analysis}</div>
                </div>
                <button onClick={generateAIAnalysis} style={{width:"100%",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",color:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  🔄 Regenerar análisis
                </button>
              </div>
            )}
          </div>

          {/* Leyenda */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:18}}>
            <div style={{color:C.text,fontSize:13,fontWeight:800,marginBottom:12}}>📐 Cómo se calcula el riesgo</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                {label:"Volumen total de reportes", weight:"x3 puntos", color:C.blue},
                {label:"Reportes críticos P1", weight:"x8 puntos", color:C.red},
                {label:"Actividad de esta semana", weight:"x5 puntos", color:C.orange},
                {label:"Tendencia al alza", weight:"+15 puntos", color:C.purple},
              ].map(item=>(
                <div key={item.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:C.surface2,borderRadius:8}}>
                  <span style={{color:C.muted,fontSize:11}}>{item.label}</span>
                  <span style={{color:item.color,fontSize:11,fontWeight:700}}>{item.weight}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:14}}>
              {[
                {label:"Alto (60+)",color:C.red},
                {label:"Medio (30-59)",color:C.orange},
                {label:"Bajo (<30)",color:C.green},
              ].map(item=>(
                <div key={item.label} style={{flex:1,display:"flex",alignItems:"center",gap:6,background:`${item.color}15`,borderRadius:8,padding:"6px 8px"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:item.color}}/>
                  <span style={{color:item.color,fontSize:10,fontWeight:700}}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}