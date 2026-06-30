// UBICACIÓN: willay-app/app/(tabs)/chat-operador.tsx
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";

interface Message { id: string; text: string; senderName: string; senderId: string; type: "admin"|"operator"; createdAt: any; }

function formatTime(ts: any) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
}

export default function ChatOperador() {
  const { user }          = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const db = getDb();
    const q  = query(collection(db,"admin_chat"), orderBy("createdAt","asc"));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()} as Message)));
      setTimeout(()=>listRef.current?.scrollToEnd({animated:true}),100);
    });
  },[]);

  async function send() {
    if (!input.trim()||loading||!user) return;
    setLoading(true);
    try {
      const db = getDb();
      await addDoc(collection(db,"admin_chat"),{
        text:       input.trim(),
        senderName: profile?.displayName||"Operador",
        senderId:   user.uid,
        type:       "operator",
        createdAt:  serverTimestamp(),
      });
      setInput("");
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAvatar}>
          <Ionicons name="shield-checkmark" size={18} color="white"/>
        </View>
        <View>
          <Text style={s.headerTitle}>Torre de Control</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot}/>
            <Text style={s.onlineTxt}>Super Admin</Text>
          </View>
        </View>
      </View>

      {/* Mensajes */}
      <FlatList ref={listRef} data={messages} keyExtractor={m=>m.id}
        contentContainerStyle={s.msgList}
        onContentSizeChange={()=>listRef.current?.scrollToEnd({animated:true})}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{fontSize:48}}>💬</Text>
            <Text style={s.emptyTxt}>Sin mensajes aún</Text>
            <Text style={s.emptySub}>Escribe al Super Admin</Text>
          </View>
        }
        renderItem={({item})=>{
          const isMe = item.type==="operator" && item.senderId===user?.uid;
          const isAdmin = item.type==="admin";
          return (
            <View style={[s.msgRow, isMe&&s.msgRowMe]}>
              {isAdmin&&(
                <View style={[s.avatar,{backgroundColor:colors.brand}]}>
                  <Ionicons name="shield-checkmark" size={12} color="white"/>
                </View>
              )}
              <View style={{maxWidth:"75%"}}>
                {!isMe&&<Text style={s.senderName}>{item.senderName} · {formatTime(item.createdAt)}</Text>}
                <View style={[s.bubble, isMe?s.bubbleMe:isAdmin?s.bubbleAdmin:s.bubbleOther]}>
                  <Text style={[s.bubbleTxt, isMe&&{color:"white"}]}>{item.text}</Text>
                </View>
                {isMe&&<Text style={[s.senderName,{textAlign:"right"}]}>{formatTime(item.createdAt)}</Text>}
              </View>
              {isMe&&(
                <View style={[s.avatar,{backgroundColor:colors.warning}]}>
                  <Ionicons name="person" size={12} color="white"/>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput style={s.input} placeholder="Escribe un mensaje..." placeholderTextColor={colors.textMuted}
          value={input} onChangeText={setInput} editable={!loading} returnKeyType="send"
          onSubmitEditing={send} multiline/>
        <TouchableOpacity style={[s.sendBtn,(!input.trim()||loading)&&{opacity:0.4}]}
          onPress={send} disabled={!input.trim()||loading}>
          {loading?<ActivityIndicator size="small" color="white"/>
            :<Ionicons name="send" size={18} color="white"/>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:   {flex:1,backgroundColor:colors.bg},
  header:      {flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:16,paddingVertical:14,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border},
  headerAvatar:{width:40,height:40,borderRadius:20,backgroundColor:colors.brand,alignItems:"center",justifyContent:"center"},
  headerTitle: {color:colors.text,fontSize:15,fontWeight:"800"},
  onlineRow:   {flexDirection:"row",alignItems:"center",gap:5,marginTop:2},
  onlineDot:   {width:6,height:6,borderRadius:3,backgroundColor:"#22C55E"},
  onlineTxt:   {color:colors.textMuted,fontSize:11},
  msgList:     {padding:16,gap:12,flexGrow:1},
  empty:       {alignItems:"center",paddingTop:80,gap:8},
  emptyTxt:    {color:colors.text,fontSize:16,fontWeight:"700"},
  emptySub:    {color:colors.textMuted,fontSize:13},
  msgRow:      {flexDirection:"row",alignItems:"flex-end",gap:8},
  msgRowMe:    {flexDirection:"row-reverse"},
  avatar:      {width:28,height:28,borderRadius:14,alignItems:"center",justifyContent:"center",flexShrink:0},
  senderName:  {color:colors.textMuted,fontSize:10,marginBottom:3},
  bubble:      {borderRadius:16,paddingHorizontal:14,paddingVertical:10},
  bubbleAdmin: {backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderBottomLeftRadius:4},
  bubbleOther: {backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderBottomLeftRadius:4},
  bubbleMe:    {backgroundColor:colors.warning,borderBottomRightRadius:4},
  bubbleTxt:   {color:colors.text,fontSize:14,lineHeight:20},
  inputRow:    {flexDirection:"row",alignItems:"flex-end",gap:10,padding:12,paddingBottom:24,borderTopWidth:1,borderTopColor:colors.border,backgroundColor:colors.surface},
  input:       {flex:1,color:colors.text,fontSize:14,backgroundColor:colors.bg,borderRadius:20,borderWidth:1,borderColor:colors.border,paddingHorizontal:16,paddingVertical:10,maxHeight:100},
  sendBtn:     {width:44,height:44,borderRadius:22,backgroundColor:colors.warning,alignItems:"center",justifyContent:"center"},
});