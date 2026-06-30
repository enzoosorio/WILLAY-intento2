// UBICACIÓN: willay-app/app/(tabs)/operator.tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Image, RefreshControl } from "react-native";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "@/lib/firebase";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";

interface Report {
  id: string; priority: string; status: string; type: string;
  categoryLabel: string; text: string; zone: string;
  authorName: string; createdAt: any;
  location?: { latitude: number; longitude: number };
}
interface MissingPerson {
  id: string; name: string; age: number; description: string;
  photoUrl?: string; status: string; createdAt: any; lastSeenZone?: string;
}

function pColor(p: string) {
  if (p==="P1") return "#EF4444";
  if (p==="P2") return "#F97316";
  return "#3B82F6";
}
function sLabel(s: string) {
  if (s==="received")  return "Recibido";
  if (s==="attending") return "En atención";
  if (s==="closed")    return "Cerrado";
  return s;
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

export default function OperatorScreen() {
  const { user }          = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [missing,  setMissing]  = useState<MissingPerson[]>([]);
  const [tab,      setTab]      = useState<"alerts"|"missing">("alerts");
  const [refresh,  setRefresh]  = useState(false);

  useEffect(() => {
    const db = getDb();
    const q  = query(collection(db,"reports"), orderBy("createdAt","desc"));
    return onSnapshot(q, snap => {
      setReports(snap.docs.map(d=>({id:d.id,...d.data()} as Report))
        .filter(r=>r.status!=="closed"&&r.status!=="dismissed"));
    });
  },[]);

  useEffect(() => {
    const db = getDb();
    return onSnapshot(collection(db,"missing_persons"), snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()} as MissingPerson))
        .filter(p=>p.status==="active")
        .sort((a,b)=>(b.createdAt?.toDate?.()?.getTime()??0)-(a.createdAt?.toDate?.()?.getTime()??0));
      setMissing(data);
    });
  },[]);

  async function changeStatus(id: string, status: string) {
    const db = getDb();
    await updateDoc(doc(db,"reports",id),{status});
  }

  function openMap(lat: number, lng: number) {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}&z=17`);
  }

  const p1=reports.filter(r=>r.priority==="P1").length;
  const p2=reports.filter(r=>r.priority==="P2").length;
  const p3=reports.filter(r=>r.priority==="P3").length;

  return (
    <View style={s.container}>
      {/* Header */}
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

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          {label:"P1",count:p1,color:"#EF4444"},
          {label:"P2",count:p2,color:"#F97316"},
          {label:"P3",count:p3,color:"#3B82F6"},
          {label:"Desap.",count:missing.length,color:"#A855F7"},
        ].map(item=>(
          <View key={item.label} style={[s.statCard,{borderTopColor:item.color}]}>
            <Text style={[s.statNum,{color:item.color}]}>{item.count}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity onPress={()=>setTab("alerts")} style={[s.tab, tab==="alerts"&&s.tabActiveRed]}>
          <Text style={[s.tabTxt, tab==="alerts"&&{color:"#EF4444"}]}>🚨 Alertas ({reports.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>setTab("missing")} style={[s.tab, tab==="missing"&&s.tabActivePurple]}>
          <Text style={[s.tabTxt, tab==="missing"&&{color:"#A855F7"}]}>🔍 Desaparecidos ({missing.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Alertas */}
      {tab==="alerts"&&(
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
                  <View style={[s.statusBadge,{backgroundColor:r.status==="attending"?"#1e3a5f":"#1a2332"}]}>
                    <Text style={[s.statusTxt,{color:r.status==="attending"?"#3B82F6":"#64748B"}]}>{sLabel(r.status)}</Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  {r.location?.latitude&&(
                    <TouchableOpacity onPress={()=>openMap(r.location!.latitude,r.location!.longitude)}
                      style={[s.actionBtn,{backgroundColor:"#1e3a5f"}]}>
                      <Ionicons name="map" size={14} color="#3B82F6"/>
                      <Text style={[s.actionTxt,{color:"#3B82F6"}]}>Ver GPS</Text>
                    </TouchableOpacity>
                  )}
                  {r.status!=="attending"&&(
                    <TouchableOpacity onPress={()=>changeStatus(r.id,"attending")}
                      style={[s.actionBtn,{backgroundColor:"rgba(34,197,94,0.15)"}]}>
                      <Ionicons name="eye" size={14} color={colors.success}/>
                      <Text style={[s.actionTxt,{color:colors.success}]}>Atender</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={()=>changeStatus(r.id,"closed")}
                    style={[s.actionBtn,{backgroundColor:"rgba(100,116,139,0.15)"}]}>
                    <Ionicons name="checkmark-done" size={14} color="#64748B"/>
                    <Text style={[s.actionTxt,{color:"#64748B"}]}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Desaparecidos */}
      {tab==="missing"&&(
        <ScrollView contentContainerStyle={s.list}>
          {missing.length===0&&(
            <View style={s.empty}>
              <Ionicons name="person-outline" size={52} color={colors.textMuted}/>
              <Text style={s.emptyTxt}>Sin personas desaparecidas</Text>
              <Text style={s.emptySub}>No hay casos activos</Text>
            </View>
          )}
          {missing.map(p=>(
            <View key={p.id} style={[s.card,{borderLeftColor:"#A855F7"}]}>
              <View style={s.cardTop}>
                <View style={[s.badge,{backgroundColor:"rgba(239,68,68,0.1)",borderColor:"rgba(239,68,68,0.3)"}]}>
                  <Text style={[s.badgeTxt,{color:"#EF4444"}]}>⚠ BUSCAR</Text>
                </View>
                <Text style={s.cardTitle}>{p.name}</Text>
                <Text style={s.timeAgo}>{timeAgo(p.createdAt)}</Text>
              </View>
              <View style={{flexDirection:"row",gap:10,marginTop:8}}>
                {p.photoUrl&&(
                  <Image source={{uri:p.photoUrl}} style={{width:68,height:68,borderRadius:10,flexShrink:0}}/>
                )}
                <View style={{flex:1}}>
                  <Text style={[s.cardDesc,{fontWeight:"700",color:colors.text}]}>{p.age} años</Text>
                  {p.description?<Text style={s.cardDesc} numberOfLines={2}>{p.description}</Text>:null}
                  {p.lastSeenZone?<Text style={s.metaTxt}>📍 Última vez: {p.lastSeenZone}</Text>:null}
                  <Text style={s.metaTxt}>🕐 {timeAgo(p.createdAt)}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
  statNum:      {fontSize:22,fontWeight:"900"},
  statLabel:    {color:colors.textMuted,fontSize:9,fontWeight:"700",marginTop:2},
  tabs:         {flexDirection:"row",backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border},
  tab:          {flex:1,paddingVertical:12,alignItems:"center",borderBottomWidth:2,borderBottomColor:"transparent"},
  tabActiveRed: {borderBottomColor:"#EF4444"},
  tabActivePurple:{borderBottomColor:"#A855F7"},
  tabTxt:       {color:colors.textMuted,fontSize:13,fontWeight:"600"},
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
  statusBadge:  {paddingHorizontal:8,paddingVertical:2,borderRadius:6,marginLeft:"auto"},
  statusTxt:    {fontSize:10,fontWeight:"700"},
  cardActions:  {flexDirection:"row",gap:8,flexWrap:"wrap"},
  actionBtn:    {flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:8},
  actionTxt:    {fontSize:12,fontWeight:"600"},
  empty:        {alignItems:"center",paddingTop:60,gap:8},
  emptyTxt:     {color:colors.text,fontSize:16,fontWeight:"700"},
  emptySub:     {color:colors.textMuted,fontSize:13},
});