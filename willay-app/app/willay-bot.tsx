import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";

const GROQ_API_KEY = "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";
const GROQ_MODEL   = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `Eres WillayBot, el asistente de seguridad ciudadana del distrito de Puente Piedra, Lima, Peru.
Tu funcion es ayudar a los vecinos en situaciones de emergencia y peligro.
Responde SIEMPRE en espanol, de forma clara y concisa (maximo 3-4 oraciones).
Da consejos practicos y accionables.
En emergencias recomienda: Serenazgo Puente Piedra (01)219-6220, Policia 105, Bomberos 116, Ambulancia 106.
Puente Piedra tiene 3 zonas: Norte (Zapallal, El Dorado), Centro (Santa Rosa, Las Vegas) y Sur (La Ensenada, Chillon).
Se empatico pero directo.`;

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  loading?: boolean;
}

const SUGGESTIONS = [
  "¿Qué hago si me roban?",
  "¿Cómo reporto una emergencia?",
  "¿Cuál es el número del Serenazgo?",
  "¿Qué es una alerta P1?",
];

async function askGroq(message: string, history: Message[]): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history
      .filter((m) => !m.loading && m.id !== "welcome")
      .slice(-6)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: message },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 300, temperature: 0.7 }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export default function WillayBotScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "¡Hola! Soy WillayBot 👮, el asistente de seguridad ciudadana de Puente Piedra. ¿En qué puedo ayudarte?",
    },
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: msg };
    const loadingMsg: Message = { id: "loading", role: "bot", text: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const reply = await askGroq(msg, [...messages, userMsg]);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        { id: Date.now().toString(), role: "bot", text: reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        { id: Date.now().toString(), role: "bot", text: "Lo siento, no puedo responder ahora. Llama al Serenazgo: (01) 219-6220." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.botInfo}>
          <View style={styles.botAvatar}>
            <Ionicons name="shield-checkmark" size={20} color="white" />
          </View>
          <View>
            <Text style={styles.botName}>WillayBot</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineTxt}>Asistente de seguridad</Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            messages.length === 1 ? (
              <View style={styles.suggestionsWrap}>
                <Text style={styles.suggestionsTitle}>Preguntas frecuentes:</Text>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} style={styles.suggestionBtn} onPress={() => send(s)}>
                      <Text style={styles.suggestionTxt}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isUser = item.role === "user";
            return (
              <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
                {!isUser && (
                  <View style={styles.botAvatarSmall}>
                    <Ionicons name="shield-checkmark" size={14} color="white" />
                  </View>
                )}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                  {item.loading ? (
                    <View style={styles.typingDots}>
                      <ActivityIndicator size="small" color={colors.textMuted} />
                      <Text style={styles.typingTxt}>Escribiendo...</Text>
                    </View>
                  ) : (
                    <Text style={[styles.bubbleTxt, isUser && { color: "white" }]}>{item.text}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu consulta..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
              onPress={() => send()}
              disabled={!input.trim() || loading}
            >
              <Ionicons name="send" size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            WillayBot usa IA. En emergencias llama al 105 (Policía) o 116 (Bomberos).
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg, alignItems: "center", justifyContent: "center",
  },
  botInfo:   { flexDirection: "row", alignItems: "center", gap: 10 },
  botAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  botName:   { color: colors.text, fontSize: 16, fontWeight: "800" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  onlineTxt: { color: colors.textMuted, fontSize: 11 },

  list: { padding: 16, gap: 12, paddingBottom: 8 },

  suggestionsWrap: { marginTop: 16, gap: 10 },
  suggestionsTitle: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestionBtn: {
    backgroundColor: colors.surface, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  suggestionTxt: { color: colors.text, fontSize: 13 },

  msgRow:     { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },

  botAvatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },

  bubble:     { maxWidth: "80%", borderRadius: 18, padding: 12 },
  bubbleBot:  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleTxt:  { color: colors.text, fontSize: 14, lineHeight: 20 },

  typingDots: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingTxt:  { color: colors.textMuted, fontSize: 13 },

  inputArea: {
    padding: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface, gap: 6,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1, color: colors.text, fontSize: 15,
    backgroundColor: colors.bg, borderRadius: 24,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  disclaimer: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
});