// Servicio de notificaciones push via Expo Push API
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: "default";
  priority?: "normal" | "high";
}

export async function sendPushToTokens(tokens: string[], message: PushMessage) {
  if (tokens.length === 0) return;

  const messages = tokens
    .filter(t => t && t.startsWith("ExponentPushToken"))
    .map(to => ({
      to,
      sound: "default",
      priority: "high",
      ...message,
    }));

  if (messages.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(messages),
    });
    return await res.json();
  } catch (e) {
    console.error("Error enviando notificaciones:", e);
  }
}