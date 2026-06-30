// UBICACIÓN: willay-app/lib/push.ts
// Registro de token push — guarda en Firestore para que el panel web pueda enviar notificaciones
import * as Notifications from "expo-notifications";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as any;
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
      shouldShowBanner: true,
      shouldShowList:   true,
    };
  },
});

export async function registerForPushAsync(uid: string) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });
    const token = tokenData.data;
    if (!token) return;

    // Guardar en Firestore — el panel web lo usa para enviar notificaciones push
    const db = getDb();
    await updateDoc(doc(db, "users", uid), {
      expoPushTokens: arrayUnion(token),
    });

    console.log("[push] Token registrado:", token);
  } catch (e) {
    console.warn("[push] Error registrando token:", e);
  }
}

// Listener de notificaciones recibidas
export function setupNotificationListeners() {
  // Cuando llega notificación con la app abierta
  const sub1 = Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data as any;
    console.log("[push] Notificación recibida:", data?.type);
  });

  // Cuando el usuario toca la notificación
  const sub2 = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any;
    console.log("[push] Notificación tocada:", data?.type);
    // Aquí puedes navegar a la pantalla correspondiente según data.type
    // Ej: si type === "missing_person" → router.push("/(tabs)/buscar")
    // Ej: si type === "missing_found"  → router.push("/(tabs)/buscar")
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}