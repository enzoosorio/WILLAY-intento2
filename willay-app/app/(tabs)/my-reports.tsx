// UBICACIÓN: willay-app/app/(tabs)/my-reports.tsx
// Vecino ve sus reportes + estado actualizado por operador en tiempo real
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "@/lib/firebase";
import { useAuthUser } from "@/lib/session";
import { colors } from "@/theme/colors";
import { router } from "expo-router";

interface Report {
  id: string; priority: string; status: string; type: string;
  categoryLabel: string; text: string; createdAt: any; zone: string;
}

function pColor(p: string) {
  if (p==="P1") return "#EF4444";
  if (p==="P2") return "#F97316";
  return "#3B82F6";
}
function sInfo(s: string) {
  if (s==="received")  return {label:"Recibido",  color:"#F59E0B", icon:"time-outline"};
  if (s==="attending") return {label:"En atención",color:"#3B82F6", icon:"eye-outline"};
  if (s==="closed")    return {label:"Resuelto",   color:"#22C55E", icon:"checkmark-circle-outline"};
  if (s==="dismissed") return {label:"Descartado", color:"#64748B", icon:"close-circle-outline"};
  return                      {label:s,            color:"#64748B", icon:"help-outline"};
}
function timeAgo(ts: any) {
  if (!ts?.toDate) return "";
  const m=Math.floor((Date.now()-ts.toDate().getTime())/60000);
  if (m<1) return "Ahora";
  if (m<60) return `${m} min`;
  const h=Math.floor(m/60);
  if (h<24) return `${h}h`;
  return ts.toDate().toLocaleDateString("es-PE",{day:"2-digit",month:"short"});
}

export default function MyReports() {
  const { user }   = useAuthUser();
  const [reports,  setReports]  = useState<Report[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const q  = query(
      collection(db,"reports"),
      where("authorId","==",user.uid),
      orderBy("createdAt","desc")
    );
    return onSnapshot(q, snap => {
      setReports(snap.docs.map(d=>({id:d.id,...d.data()} as Report)));
      setLoading(false);
    });
  },[user]);

  const activos   = reports.filter(r=>r.status!=="closed"&&r.status!=="dismissed").length;
  const resueltos = reports.filter(r=>r.status==="closed").length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Mis Reportes</Text>
        <Text style={s.sub}>{reports.length} total</Text>
      </View>

      {/* Resumen */}
      <View style={s.statsRow}>
        <View style={[s.stat,{borderTopColor:"#F59E0B"}]}>
          <Text style={[s.statNum,{color:"#F59E0B"}]}>{activos}</Text>
          <Text style={s.statLbl}>Activos</Text>
        </View>
        <View style={[s.stat,{borderTopColor:"#22C55E"}]}>
          <Text style={[s.statNum,{color:"#22C55E"}]}>{resueltos}</Text>
          <Text style={s.statLbl}>Resueltos</Text>
        </View>
        <View style={[s.stat,{borderTopColor:"#6366F1"}]}>
          <Text style={[s.statNum,{color:"#6366F1"}]}>{reports.length}</Text>
          <Text style={s.statLbl}>Total</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {loading&&<Text style={{color:colors.textMuted,textAlign:"center",padding:24}}>Cargando...</Text>}
        {!loading&&reports.length===0&&(
          <View style={s.empty}>
            <Ionicons name="document-outline" size={52} color={colors.textMuted}/>
            <Text style={s.emptyTxt}>Sin reportes aún</Text>
            <Text style={s.emptySub}>Tus reportes aparecerán aquí</Text>
            <TouchableOpacity style={s.newBtn} onPress={()=>router.push("/(tabs)/report")}>
              <Text style={s.newBtnTxt}>+ Crear reporte</Text>
            </TouchableOpacity>
          </View>
        )}
        {reports.map(r=>{
          const pc=pColor(r.priority);
          const si=sInfo(r.status);
          return (
            <View key={r.id} style={[s.card,{borderLeftColor:pc}]}>
              <View style={s.cardTop}>
                <View style={[s.priorityBadge,{backgroundColor:pc+"22",borderColor:pc+"44"}]}>
                  <Text style={[s.priorityTxt,{color:pc}]}>{r.priority}</Text>
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {r.type==="panic"?"🚨 Alerta de Pánico":r.categoryLabel||"Reporte"}
                </Text>
                <Text style={s.cardTime}>{timeAgo(r.createdAt)}</Text>
              </View>
              {r.text?<Text style={s.cardDesc} numberOfLines={2}>{r.text}</Text>:null}
              <View style={s.statusRow}>
                <Ionicons name={si.icon as any} size={14} color={si.color}/>
                <Text style={[s.statusTxt,{color:si.color}]}>{si.label}</Text>
                {r.status==="attending"&&(
                  <View style={s.attBadge}>
                    <View style={s.attDot}/>
                    <Text style={s.attTxt}>Serenazgo atendiendo</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    {flex:1,backgroundColor:colors.bg},
  header:       {paddingHorizontal:16,paddingTop:52,paddingBottom:12,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border},
  title:        {color:colors.text,fontSize:22,fontWeight:"900"},
  sub:          {color:colors.textMuted,fontSize:12,marginTop:2},
  statsRow:     {flexDirection:"row",gap:10,padding:12,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border},
  stat:         {flex:1,backgroundColor:colors.bg,borderRadius:10,padding:10,alignItems:"center",borderTopWidth:3},
  statNum:      {fontSize:22,fontWeight:"900"},
  statLbl:      {color:colors.textMuted,fontSize:10,marginTop:2},
  list:         {padding:12,gap:10,paddingBottom:40},
  empty:        {alignItems:"center",paddingTop:60,gap:10},
  emptyTxt:     {color:colors.text,fontSize:16,fontWeight:"700"},
  emptySub:     {color:colors.textMuted,fontSize:13},
  newBtn:       {marginTop:8,backgroundColor:colors.brand,borderRadius:12,paddingHorizontal:24,paddingVertical:12},
  newBtnTxt:    {color:"white",fontWeight:"700",fontSize:14},
  card:         {backgroundColor:colors.surface,borderRadius:12,padding:14,borderLeftWidth:4,borderWidth:1,borderColor:colors.border},
  cardTop:      {flexDirection:"row",alignItems:"center",gap:8,marginBottom:6},
  priorityBadge:{paddingHorizontal:8,paddingVertical:2,borderRadius:6,borderWidth:1},
  priorityTxt:  {fontSize:10,fontWeight:"800"},
  cardTitle:    {flex:1,color:colors.text,fontSize:13,fontWeight:"700"},
  cardTime:     {color:colors.textMuted,fontSize:11},
  cardDesc:     {color:colors.textMuted,fontSize:12,marginBottom:8},
  statusRow:    {flexDirection:"row",alignItems:"center",gap:6},
  statusTxt:    {fontSize:12,fontWeight:"600"},
  attBadge:     {flexDirection:"row",alignItems:"center",gap:4,marginLeft:"auto",backgroundColor:"rgba(59,130,246,0.1)",borderRadius:999,paddingHorizontal:8,paddingVertical:3},
  attDot:       {width:5,height:5,borderRadius:3,backgroundColor:"#3B82F6"},
  attTxt:       {color:"#3B82F6",fontSize:10,fontWeight:"600"},
});