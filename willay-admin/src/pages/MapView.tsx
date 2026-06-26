import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Report {
  id: string; priority: string; status: string; type: string;
  categoryLabel: string; text: string; authorName: string;
  location?: { latitude: number; longitude: number };
}

function pColor(p: string) {
  if (p === "P1") return "#EF4444";
  if (p === "P2") return "#F97316";
  return "#3B82F6";
}

function createRadarIcon(priority: string) {
  const color = pColor(priority);
  const size  = priority === "P1" ? 20 : priority === "P2" ? 16 : 12;
  const speed = priority === "P1" ? "1s" : priority === "P2" ? "1.5s" : "2s";

  const html = `
    <div style="position:relative;width:${size*3}px;height:${size*3}px;display:flex;align-items:center;justify-content:center;">
      <div style="
        position:absolute;
        width:${size*3}px;height:${size*3}px;
        border-radius:50%;
        background:${color};
        opacity:0;
        animation:radar-pulse ${speed} ease-out infinite;
      "></div>
      <div style="
        position:absolute;
        width:${size*2}px;height:${size*2}px;
        border-radius:50%;
        background:${color};
        opacity:0;
        animation:radar-pulse ${speed} ease-out infinite;
        animation-delay:0.3s;
      "></div>
      <div style="
        position:absolute;
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:${color};
        border:2px solid white;
        box-shadow:0 0 8px ${color};
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize:  [size * 3, size * 3],
    iconAnchor:[size * 1.5, size * 1.5],
    popupAnchor:[0, -size],
  });
}

function MapController() {
  const map = useMap();
  useEffect(() => { map.setView([-11.87, -77.07], 13); }, []);
  return null;
}

export default function MapView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [now,     setNow]     = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "reports"), snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    });
  }, []);

  const withLoc  = reports.filter(r => r.location?.latitude && r.location?.longitude);
  const filtered = withLoc.filter(r => filter === "all" || r.priority === filter);
  const p1 = withLoc.filter(r => r.priority === "P1").length;
  const p2 = withLoc.filter(r => r.priority === "P2").length;
  const p3 = withLoc.filter(r => r.priority === "P3").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 64px)", gap:16 }}>
      <style>{`
        @keyframes radar-pulse {
          0%   { transform: scale(0.5); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ color:"#F9FAFB", fontSize:28, fontWeight:900, margin:0 }}>Mapa de incidencias</h1>
          <p style={{ color:"#6B7280", fontSize:13, margin:"4px 0 0" }}>
            {filtered.length} reportes visibles · Puente Piedra, Lima
          </p>
        </div>
        <div style={{ color:"#10B981", fontSize:20, fontWeight:900, fontFamily:"monospace" }}>
          {now.toLocaleTimeString("es-PE")}
        </div>
      </div>

      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        {[
          { label:"Todos", value:"all", count: withLoc.length, color:"#6366F1" },
          { label:"P1",    value:"P1",  count: p1,             color:"#EF4444" },
          { label:"P2",    value:"P2",  count: p2,             color:"#F97316" },
          { label:"P3",    value:"P3",  count: p3,             color:"#3B82F6" },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            display:"flex", alignItems:"center", gap:8, padding:"10px 18px",
            borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13,
            background: filter===f.value ? `${f.color}22` : "#161b22",
            border: filter===f.value ? `1px solid ${f.color}88` : "1px solid #21262d",
            color: filter===f.value ? f.color : "#6B7280",
          }}>
            <span>{f.label}</span>
            <span style={{
              background: filter===f.value ? f.color : "#21262d",
              color: filter===f.value ? "white" : "#9CA3AF",
              borderRadius:999, padding:"1px 8px", fontSize:11
            }}>{f.count}</span>
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:16 }}>
          {[["P1 Crítico","#EF4444"],["P2 Moderado","#F97316"],["P3 Menor","#3B82F6"]].map(([l,c]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:c }} />
              <span style={{ color:"#9CA3AF", fontSize:12 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex:1, borderRadius:16, overflow:"hidden", border:"1px solid #21262d", position:"relative" }}>
        <MapContainer center={[-11.87, -77.07]} zoom={13} style={{ height:"100%", width:"100%" }}>
          <MapController />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {filtered.map(r => (
            <Marker
              key={r.id}
              position={[r.location!.latitude, r.location!.longitude]}
              icon={createRadarIcon(r.priority)}
            >
              <Popup>
                <div style={{ minWidth:200, fontFamily:"system-ui,sans-serif" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{
                      padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:800,
                      background:`${pColor(r.priority)}22`, color:pColor(r.priority),
                      border:`1px solid ${pColor(r.priority)}44`
                    }}>{r.priority}</span>
                    <strong>{r.type==="panic" ? "🚨 Pánico" : r.categoryLabel||"Reporte"}</strong>
                  </div>
                  <p style={{ margin:"0 0 6px", fontSize:13, color:"#333" }}>{r.text||"Sin descripción"}</p>
                  <p style={{ margin:0, fontSize:12, color:"#666" }}>👤 {r.authorName||"—"}</p>
                  <p style={{ margin:"4px 0 0", fontSize:12, color:"#666" }}>
                    Estado: <strong>{r.status==="closed"?"Cerrado":r.status==="attending"?"En atención":"Recibido"}</strong>
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div style={{
          position:"absolute", top:16, right:16, zIndex:1000,
          background:"rgba(13,17,23,0.9)", border:"1px solid #21262d",
          borderRadius:12, padding:"12px 16px"
        }}>
          <div style={{ color:"#6B7280", fontSize:10, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>En mapa</div>
          <div style={{ color:"#F9FAFB", fontSize:24, fontWeight:900 }}>{filtered.length}</div>
          <div style={{ color:"#6B7280", fontSize:11 }}>incidencias</div>
        </div>
      </div>
    </div>
  );
}