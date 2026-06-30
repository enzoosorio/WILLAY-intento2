// UBICACIÓN: willay-app/app/(tabs)/operator.tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Image, RefreshControl, Modal, Platform, TextInput } from "react-native";
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "@/lib/firebase";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";

interface Report {
  id: string; priority: string; status: string; type: string;
  categoryLabel: string; text: string; zone: string;
  authorName: string; createdAt: any;
  location?: { latitude: number; longitude: number };
  verification?: "pending"|"verified"|"false";
  servicesRequested?: string[];
}

function pColor(p: string) {
  if (p==="P1") return "#EF4444";
  if (p==="P2") return "#F97316";
  return "#3B82F6";
}
function timeAgo(ts: any) {
  if (!ts?.toDate) return "";
  const m = Math.floor((Date.now()-ts.toDate().getTime())/60000);
  if (m<1) return "Ahora";
  if (m<60) return `${m}m`;
  const h=Math.floor(m/60);
  if (h<24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

const SERVICES = [
  { key:"ambulance",    label:"Ambulancia / SAMU",  icon:"medical",  color:"#22C55E", phone:"106" },
  { key:"firefighters", label:"Bomberos",           icon:"flame",    color:"#F97316", phone:"116" },
  { key:"police",       label:"Policía Nacional",   icon:"shield",   color:"#3B82F6", phone:"105" },
  { key:"serenazgo",    label:"Más unidades Serenazgo", icon:"people", color:"#EF4444", phone:"(01) 219-6220" },
];

export default function OperatorScreen() {
  const { user }          = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [refresh,  setRefresh]  = useState(false);
  const [verifyModal, setVerifyModal] = useState<Report|null>(null);
  const [servicesModal, setServicesModal] = useState<Report|null>(null);
  const [falseReason, setFalseReason] = useState("");
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const db = getDb();
    const q  = query(collection(db,"reports"), orderBy("createdAt","desc"));
    return onSnapshot(q, snap => {
      setReports(snap.docs.map(d=>({id:d.id,...d.data()} as Report))
        .filter(r=>r.status!=="closed"&&r.status!=="dismissed"));
    });
  },[]);

  async function changeStatus(id: string, status: string) {
    const db = getDb();
    await updateDoc(doc(db,"reports",id),{status});
  }

  function navigateToIncident(lat: number, lng: number) {
    const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
    const googleMapsUrl = Platform.select({
      ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
    });
    const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    Linking.canOpenURL(wazeUrl).then(supported => {
      if (supported) { Linking.openURL(wazeUrl); return; }
      Linking.canOpenURL(googleMapsUrl!).then(supported2 => {
        if (supported2) Linking.openURL(googleMapsUrl!);
        else Linking.openURL(webFallback);
      });
    });
  }

  // PASO 1: Operador confirma que el reporte es REAL (llegó al lugar y vio el incidente)
  async function confirmReal(report: Report) {
    const db = getDb();
    await updateDoc(doc(db,"reports",report.id),{
      verification: "verified",
      status: "attending",
    });
    await addDoc(collection(db,"verification_logs"),{
      reportId: report.id,
      result: "verified",
      verifiedBy: profile?.displayName||"Operador",
      zone: profile?.zone||"—",
      reportText: report.text||"",
      reportPriority: report.priority,
      location: report.location||null,
      createdAt: serverTimestamp(),
    });
    setVerifyModal(null);
    // Abre directo el modal de servicios necesarios
    setServicesModal(report);
  }

  // PASO 1 alternativo: Operador confirma que es FALSO/no hay nada
  async function confirmFalse(report: Report) {
    setSending(true);
    try {
      const db = getDb();
      await updateDoc(doc(db,"reports",report.id),{
        verification: "false",
        status: "dismissed",
      });
      await addDoc(collection(db,"verification_logs"),{
        reportId: report.id,
        result: "false",
        reason: falseReason || "Sin incidencia al llegar al lugar",
        verifiedBy: profile?.displayName||"Operador",
        zone: profile?.zone||"—",
        reportText: report.text||"",
        location: report.location||null,
        createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
      setFalseReason("");
      setVerifyModal(null);
    }
  }

  // PASO 2: Tras confirmar que es real, solicitar servicios necesarios
  async function submitServices(report: Report) {
    if (selectedServices.size === 0) { setServicesModal(null); return; }
    setSending(true);
    try {
      const db = getDb();
      const services = Array.from(selectedServices);

      for (const key of services) {
        const svc = SERVICES.find(s=>s.key===key)!;
        await addDoc(collection(db,"reinforcement_requests"),{
          reportId: report.id,
          type: key,
          typeLabel: svc.label,
          requestedBy: profile?.displayName||"Operador",
          requestedByZone: profile?.zone||"—",
          location: report.location||null,
          reportText: report.text||"",
          reportPriority: report.priority,
          status: "pending",
          verifiedOnSite: true,
          createdAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db,"reports",report.id),{
        servicesRequested: services,
      });

      // Llamar al primer servicio seleccionado
      const first = SERVICES.find(s=>s.key===services[0]);
      if (first) Linking.openURL(`tel:${first.phone}`);

    } finally {
      setSending(false);
      setSelectedServices(new Set());
      setServicesModal(null);
    }
  }

  function toggleService(key: string) {
    setSelectedServices(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const p1=reports.filter(r=>r.priority==="P1").length;
  const p2=reports.filter(r=>r.priority==="P2").length;
  const p3=reports.filter(r=>r.priority==="P3").length;
  const pendingVerify = reports.filter(r=>!r.verification||r.verification==="pending").length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Panel Serenazgo</Text>
          <Text style={s.headerSub}>{profile?.displayName||"Operador"} · {profile?.zone||"—"}</Text>
        </View>
        <View style={s.onlinePill}>
          <View style={s.onlineDot}/>
          <Text style={s.onlineTxt}>EN LÍNEA</Text>
        </View>
      </View>

      <View style={s.statsRow}>
        {[
          {label:"P1",count:p1,color:"#EF4444"},
          {label:"P2",count:p2,color:"#F97316"},
          {label:"P3",count:p3,color:"#3B82F6"},
          {label:"Sin verificar",count:pendingVerify,color:"#EAB308"},
        ].map(item=>(
          <View key={item.label} style={[s.statCard,{borderTopColor:item.color}]}>
            <Text style={[s.statNum,{color:item.color}]}>{item.count}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={()=>setRefresh(false)}/>}>
        {reports.length===0&&(
          <View style={s.empty}>
            <Ionicons name="checkmark-circle" size={52} color={colors.success}/>
            <Text style={s.emptyTxt}>Sin alertas activas</Text>
            <Text style={s.emptySub}>El distrito está tranquilo</Text>
          </View>
        )}
        {reports.map(r=>{
          const pc=pColor(r.priority);
          const hasLoc = !!r.location?.latitude;
          const isVerified = r.verification === "verified";
          const needsVerification = !r.verification || r.verification === "pending";

          return (
            <View key={r.id} style={[s.card,{borderLeftColor:pc}]}>
              <View style={s.cardTop}>
                <View style={[s.badge,{backgroundColor:pc+"22",borderColor:pc+"44"}]}>
                  <Text style={[s.badgeTxt,{color:pc}]}>{r.priority}</Text>
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {r.type==="panic"?"🚨 Alerta de Pánico":r.categoryLabel||"Reporte"}
                </Text>
                <Text style={s.timeAgo}>{timeAgo(r.createdAt)}</Text>
              </View>
              {r.text?<Text style={s.cardDesc} numberOfLines={2}>{r.text}</Text>:null}
              <View style={s.cardMeta}>
                <Text style={s.metaTxt}>👤 {r.authorName||"—"}</Text>
                <Text style={s.metaTxt}>📍 {r.zone||"—"}</Text>
              </View>

              {/* Badge de estado de verificación */}
              {isVerified && (
                <View style={s.verifiedBanner}>
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E"/>
                  <Text style={s.verifiedTxt}>Verificado en sitio — Incidente confirmado</Text>
                </View>
              )}
              {needsVerification && (
                <View style={s.pendingBanner}>
                  <Ionicons name="alert-circle" size={14} color="#EAB308"/>
                  <Text style={s.pendingTxt}>Pendiente de verificación en campo</Text>
                </View>
              )}

              {/* Servicios ya solicitados */}
              {r.servicesRequested && r.servicesRequested.length > 0 && (
                <View style={s.servicesTags}>
                  {r.servicesRequested.map(key => {
                    const svc = SERVICES.find(x=>x.key===key);
                    if (!svc) return null;
                    return (
                      <View key={key} style={[s.serviceTag,{backgroundColor:svc.color+"22",borderColor:svc.color+"44"}]}>
                        <Ionicons name={svc.icon as any} size={11} color={svc.color}/>
                        <Text style={[s.serviceTagTxt,{color:svc.color}]}>{svc.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Navegar al lugar */}
              {hasLoc && (
                <TouchableOpacity onPress={()=>navigateToIncident(r.location!.latitude, r.location!.longitude)} style={s.navigateBtn}>
                  <Ionicons name="navigate" size={18} color="white"/>
                  <Text style={s.navigateBtnTxt}>Ir al lugar de la incidencia</Text>
                  <Ionicons name="arrow-forward" size={16} color="white"/>
                </TouchableOpacity>
              )}

              <View style={s.cardActions}>
                {needsVerification ? (
                  <TouchableOpacity onPress={()=>setVerifyModal(r)} style={s.verifyBtn}>
                    <Ionicons name="eye-outline" size={16} color="white"/>
                    <Text style={s.verifyBtnTxt}>Verificar en sitio</Text>
                  </TouchableOpacity>
                ) : isVerified ? (
                  <TouchableOpacity onPress={()=>setServicesModal(r)} style={s.servicesBtn}>
                    <Ionicons name="add-circle" size={16} color="white"/>
                    <Text style={s.verifyBtnTxt}>Solicitar más servicios</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={()=>changeStatus(r.id,"closed")} style={[s.actionBtn,{backgroundColor:"rgba(100,116,139,0.15)"}]}>
                  <Ionicons name="checkmark-done" size={14} color="#64748B"/>
                  <Text style={[s.actionTxt,{color:"#64748B"}]}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL 1: Verificar en sitio */}
      <Modal visible={!!verifyModal} transparent animationType="slide" onRequestClose={()=>setVerifyModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>📍 Verificación en sitio</Text>
            <Text style={s.modalSub}>
              {verifyModal?.type==="panic"?"Alerta de Pánico":verifyModal?.categoryLabel} · {verifyModal?.zone}
            </Text>
            <Text style={s.modalQuestion}>¿Qué encontraste al llegar al lugar?</Text>

            <TouchableOpacity onPress={()=>verifyModal&&confirmReal(verifyModal)} style={s.optionReal}>
              <View style={[s.optionIcon,{backgroundColor:"rgba(34,197,94,0.2)"}]}>
                <Ionicons name="checkmark-circle" size={28} color="#22C55E"/>
              </View>
              <View style={{flex:1}}>
                <Text style={s.optionTitle}>Sí, hay una incidencia real</Text>
                <Text style={s.optionDesc}>Confirmar y solicitar servicios necesarios</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#22C55E"/>
            </TouchableOpacity>

            <View style={{marginTop:12}}>
              <TouchableOpacity onPress={()=>verifyModal&&confirmFalse(verifyModal)} disabled={sending} style={s.optionFalse}>
                <View style={[s.optionIcon,{backgroundColor:"rgba(100,116,139,0.2)"}]}>
                  <Ionicons name="close-circle" size={28} color="#64748B"/>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.optionTitle}>No, es falsa alarma</Text>
                  <Text style={s.optionDesc}>No hay incidencia / ya se resolvió sola</Text>
                </View>
                {sending
                  ?<Text style={{color:"#64748B",fontSize:11}}>Guardando...</Text>
                  :<Ionicons name="chevron-forward" size={20} color="#64748B"/>
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={()=>setVerifyModal(null)} style={s.modalCancel}>
              <Text style={s.modalCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Solicitar servicios necesarios */}
      <Modal visible={!!servicesModal} transparent animationType="slide" onRequestClose={()=>setServicesModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>🚨 ¿Qué servicios necesita?</Text>
            <Text style={s.modalSub}>Incidente confirmado — selecciona los que apliquen</Text>

            <View style={{gap:10,marginTop:16}}>
              {SERVICES.map(svc=>{
                const isSelected = selectedServices.has(svc.key);
                return (
                  <TouchableOpacity key={svc.key} onPress={()=>toggleService(svc.key)} style={[s.reinforceOption,{borderColor:isSelected?svc.color:svc.color+"33",backgroundColor:isSelected?svc.color+"15":colors.bg}]}>
                    <View style={[s.reinforceIcon,{backgroundColor:svc.color+"22"}]}>
                      <Ionicons name={svc.icon as any} size={22} color={svc.color}/>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={s.reinforceLabel}>{svc.label}</Text>
                      <Text style={s.reinforcePhone}>📞 {svc.phone}</Text>
                    </View>
                    <View style={[s.checkbox,isSelected&&{backgroundColor:svc.color,borderColor:svc.color}]}>
                      {isSelected&&<Ionicons name="checkmark" size={14} color="white"/>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity onPress={()=>servicesModal&&submitServices(servicesModal)} disabled={sending||selectedServices.size===0} style={[s.submitServicesBtn,(selectedServices.size===0||sending)&&{opacity:0.5}]}>
              <Text style={s.submitServicesBtnTxt}>
                {sending?"Enviando...":selectedServices.size>0?`Solicitar ${selectedServices.size} servicio(s)`:"Selecciona al menos uno"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>{setServicesModal(null);setSelectedServices(new Set());}} style={s.modalCancel}>
              <Text style={s.modalCancelTxt}>No necesita más ayuda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:    {flex:1,backgroundColor:colors.bg},
  header:       {flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:16,paddingTop:52,paddingBottom:12,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border},
  headerTitle:  {color:colors.text,fontSize:18,fontWeight:"900"},
  headerSub:    {color:colors.textMuted,fontSize:12,marginTop:2},
  onlinePill:   {flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(34,197,94,0.1)",borderWidth:1,borderColor:"rgba(34,197,94,0.3)",borderRadius:999,paddingHorizontal:10,paddingVertical:4},
  onlineDot:    {width:6,height:6,borderRadius:3,backgroundColor:"#22C55E"},
  onlineTxt:    {color:"#22C55E",fontSize:10,fontWeight:"700"},
  statsRow:     {flexDirection:"row",gap:8,padding:12,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border},
  statCard:     {flex:1,backgroundColor:colors.bg,borderRadius:10,padding:10,alignItems:"center",borderTopWidth:3},
  statNum:      {fontSize:20,fontWeight:"900"},
  statLabel:    {color:colors.textMuted,fontSize:9,fontWeight:"700",marginTop:2,textAlign:"center"},
  list:         {padding:12,gap:10,paddingBottom:40},
  card:         {backgroundColor:colors.surface,borderRadius:12,padding:14,borderLeftWidth:4,borderWidth:1,borderColor:colors.border},
  cardTop:      {flexDirection:"row",alignItems:"center",gap:8,marginBottom:6},
  badge:        {paddingHorizontal:8,paddingVertical:2,borderRadius:6,borderWidth:1},
  badgeTxt:     {fontSize:10,fontWeight:"800"},
  cardTitle:    {flex:1,color:colors.text,fontSize:13,fontWeight:"700"},
  timeAgo:      {color:colors.textMuted,fontSize:11},
  cardDesc:     {color:colors.textMuted,fontSize:12,marginBottom:4},
  cardMeta:     {flexDirection:"row",gap:10,marginBottom:8,alignItems:"center",flexWrap:"wrap"},
  metaTxt:      {color:colors.textMuted,fontSize:11},
  verifiedBanner:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(34,197,94,0.1)",borderRadius:8,padding:8,marginBottom:8},
  verifiedTxt:  {color:"#22C55E",fontSize:11,fontWeight:"700"},
  pendingBanner:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(234,179,8,0.1)",borderRadius:8,padding:8,marginBottom:8},
  pendingTxt:   {color:"#EAB308",fontSize:11,fontWeight:"700"},
  servicesTags: {flexDirection:"row",gap:6,flexWrap:"wrap",marginBottom:8},
  serviceTag:   {flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:8,paddingVertical:3,borderRadius:6,borderWidth:1},
  serviceTagTxt:{fontSize:10,fontWeight:"700"},
  navigateBtn:  {flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:"#3B82F6",borderRadius:10,paddingVertical:12,marginBottom:10},
  navigateBtnTxt:{color:"white",fontSize:14,fontWeight:"800"},
  cardActions:  {flexDirection:"row",gap:8,flexWrap:"wrap"},
  actionBtn:    {flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:8},
  actionTxt:    {fontSize:12,fontWeight:"600"},
  verifyBtn:    {flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"#EAB308",borderRadius:8,paddingVertical:9},
  servicesBtn:  {flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"#EF4444",borderRadius:8,paddingVertical:9},
  verifyBtnTxt: {color:"white",fontSize:12,fontWeight:"800"},
  empty:        {alignItems:"center",paddingTop:60,gap:8},
  emptyTxt:     {color:colors.text,fontSize:16,fontWeight:"700"},
  emptySub:     {color:colors.textMuted,fontSize:13},
  modalOverlay: {flex:1,backgroundColor:"rgba(0,0,0,0.6)",justifyContent:"flex-end"},
  modalCard:    {backgroundColor:colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40,maxHeight:"85%"},
  modalHandle:  {width:40,height:4,backgroundColor:colors.border,borderRadius:2,alignSelf:"center",marginBottom:16},
  modalTitle:   {color:colors.text,fontSize:20,fontWeight:"900",textAlign:"center"},
  modalSub:     {color:colors.textMuted,fontSize:13,textAlign:"center",marginTop:4},
  modalQuestion:{color:colors.text,fontSize:14,fontWeight:"700",textAlign:"center",marginTop:16,marginBottom:8},
  optionReal:   {flexDirection:"row",alignItems:"center",gap:14,backgroundColor:"rgba(34,197,94,0.08)",borderWidth:1,borderColor:"rgba(34,197,94,0.3)",borderRadius:14,padding:16},
  optionFalse:  {flexDirection:"row",alignItems:"center",gap:14,backgroundColor:"rgba(100,116,139,0.08)",borderWidth:1,borderColor:"rgba(100,116,139,0.3)",borderRadius:14,padding:16},
  optionIcon:   {width:48,height:48,borderRadius:24,alignItems:"center",justifyContent:"center"},
  optionTitle:  {color:colors.text,fontSize:14,fontWeight:"800"},
  optionDesc:   {color:colors.textMuted,fontSize:11,marginTop:2},
  reinforceOption:{flexDirection:"row",alignItems:"center",gap:14,borderRadius:14,padding:14,borderWidth:1.5},
  reinforceIcon:{width:44,height:44,borderRadius:12,alignItems:"center",justifyContent:"center"},
  reinforceLabel:{color:colors.text,fontSize:14,fontWeight:"700"},
  reinforcePhone:{color:colors.textMuted,fontSize:12,marginTop:2},
  checkbox:     {width:24,height:24,borderRadius:6,borderWidth:2,borderColor:colors.border,alignItems:"center",justifyContent:"center"},
  submitServicesBtn:{marginTop:16,backgroundColor:"#EF4444",borderRadius:12,padding:14,alignItems:"center"},
  submitServicesBtnTxt:{color:"white",fontSize:14,fontWeight:"800"},
  modalCancel:  {marginTop:12,padding:14,alignItems:"center"},
  modalCancelTxt:{color:colors.textMuted,fontSize:14,fontWeight:"600"},
});