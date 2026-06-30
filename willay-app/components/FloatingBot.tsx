import { useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, FlatList, Keyboard,
  KeyboardEvent, Pressable, StyleSheet, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";

const { height: SH, width: SW } = Dimensions.get("window");

const GROQ_API_KEY = "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";
const GROQ_MODEL   = "llama-3.1-8b-instant";
const SYSTEM_PROMPT = `Eres WillayBot, el asistente de seguridad ciudadana del distrito de Puente Piedra, Lima, Peru.
Ayuda a los vecinos en situaciones de emergencia. Responde en espanol, maximo 3-4 oraciones.
El distrito tiene 3 zonas con 17 sectores: SUR (La Ensenada, Laderas, Chillon, Shangri-La), CENTRO (Tambo Inga Oeste, Tambo Inga Este, Pampa Libre, Gallinazos, Santa Rosa, Cercado, Las Vegas, La Grama, Copacabana), NORTE (El Dorado, Leoncio Prado, Jerusalem, Lomas).
Emergencias: Serenazgo (01)219-6220, Policia 105, Bomberos 116, SAMU 106.`;

interface Msg { id: string; role: "user" | "bot"; text: string; loading?: boolean; }

async function askGroq(message: string, history: Msg[]): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.filter((m) => !m.loading && m.id !== "welcome").slice(-6)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: message },
  ];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 250 }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()).choices[0].message.content.trim();
}

export function FloatingBot() {
  const [open,       setOpen]       = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [messages,   setMessages]   = useState<Msg[]>([
    { id: "welcome", role: "bot", text: "¡Hola! Soy WillayBot 👮 ¿En qué puedo ayudarte?" },
  ]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [kbH,       setKbH]       = useState(0);
  const listRef   = useRef<FlatList>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e: KeyboardEvent) => setKbH(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [open]);

  useEffect(() => {
    if (!open) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, open]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Msg = { id: Date.now().toString(), role: "user", text: msg };
    const loadMsg: Msg = { id: "loading", role: "bot", text: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadMsg]);
    setLoading(true);
    try {
      const reply = await askGroq(msg, [...messages, userMsg]);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        { id: Date.now().toString(), role: "bot", text: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        { id: Date.now().toString(), role: "bot", text: "Lo siento. Llama al Serenazgo: (01) 219-6220." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const chatBottom = fullscreen ? 0 : 90 + kbH;
  const chatTop    = fullscreen ? 48 : undefined;
  const chatHeight = fullscreen ? undefined : SH * 0.65;
  const chatLeft   = fullscreen ? 0 : 8;
  const chatRight  = fullscreen ? 0 : 8;
  const chatRadius = fullscreen ? 0 : 20;

  return (
    <>
      {open && <Pressable style={styles.overlay} onPress={() => { setOpen(false); setFullscreen(false); }} />}

      <Animated.View style={[
        styles.chatBase,
        { opacity: fadeAnim, bottom: chatBottom, top: chatTop, height: chatHeight,
          left: chatLeft, right: chatRight, borderRadius: chatRadius },
        !open && styles.hidden,
      ]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Ionicons name="shield-checkmark" size={16} color="white" />
            </View>
            <View>
              <Text style={styles.botName}>WillayBot</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineTxt}>En línea · IA activa</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setFullscreen((v) => !v)} style={styles.headerBtn}>
              <Ionicons name={fullscreen ? "contract" : "expand"} size={19} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setOpen(false); setFullscreen(false); }} style={styles.headerBtn}>
              <Ionicons name="close" size={21} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.msgList}
          style={{ flex: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isUser = item.role === "user";
            return (
              <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
                {!isUser && <View style={styles.botDot}><Ionicons name="shield-checkmark" size={10} color="white" /></View>}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                  {item.loading
                    ? <ActivityIndicator size="small" color={colors.textMuted} />
                    : <Text style={[styles.bubbleTxt, isUser && { color: "white" }]}>{item.text}</Text>
                  }
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.inputRow, { paddingBottom: kbH > 0 ? 8 : 12 }]}>
          <TextInput
            style={styles.input}
            placeholder="Pregúntame algo..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.fabWrap}>
        <Animated.View style={{ transform: [{ scale: open ? 1 : pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.fab, open && { backgroundColor: colors.surface, borderColor: colors.brand }]}
            onPress={() => setOpen((v) => !v)}
            activeOpacity={0.85}
          >
            <Ionicons name={open ? "close" : "shield-checkmark"} size={28} color={open ? colors.brand : "white"} />
            {!open && messages.filter((m) => m.role === "bot" && m.id !== "welcome").length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{messages.filter((m) => m.role === "bot" && m.id !== "welcome").length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        {!open && <Text style={styles.fabLabel}>WillayBot</Text>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 98 },
  hidden:  { pointerEvents: "none" as any },
  chatBase: {
    position: "absolute", backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    zIndex: 99, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 10 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerBtn:     { padding: 6 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  botName:   { color: colors.text, fontSize: 14, fontWeight: "800" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  onlineTxt: { color: colors.textMuted, fontSize: 10 },
  msgList:    { padding: 12, gap: 10 },
  msgRow:     { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  msgRowUser: { flexDirection: "row-reverse" },
  botDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  bubble:     { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleBot:  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleTxt:  { color: colors.text, fontSize: 14, lineHeight: 20 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, color: colors.text, fontSize: 14,
    backgroundColor: colors.bg, borderRadius: 22,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  fabWrap: {
    position: "absolute", bottom: 28, right: 16,
    alignItems: "center", gap: 5, zIndex: 100,
  },
  fab: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8, shadowRadius: 14, elevation: 14,
    borderWidth: 3, borderColor: "white",
  },
  fabLabel: {
    color: "white", fontSize: 10, fontWeight: "800",
    backgroundColor: colors.brand,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, overflow: "hidden",
  },
  badge: {
    position: "absolute", top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.warning, alignItems: "center", justifyContent: "center",
  },
  badgeTxt: { color: "white", fontSize: 10, fontWeight: "800" },
});