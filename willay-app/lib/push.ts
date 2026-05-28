// Registro de Expo Push Token y manejo de notificaciones recibidas.
//
// IMPORTANTE (desviación documentada de ADR-009):
//  - Originalmente el plan era FCM topics por geohash. Lo cambiamos a
//    Expo Push API porque @react-native-firebase/messaging NO funciona en
//    Expo Go (requiere dev build). Expo Push API sí funciona en Expo Go.
//  - El Cloud Function lee `users.expoPushTokens` filtrando por geohash y
//    envía via https://exp.host/--/api/v2/push/send.
//
// Notas:
//  - getExpoPushTokenAsync requiere projectId (EAS_PROJECT_ID en .env).
//    En dev sin projectId, devolvemos null y la app sigue funcionando sin push.

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { arrayUnion, updateDoc } from "firebase/firestore";

import { env } from "./env";
import { userDoc } from "./collections";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushAsync(uid: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[push] simulador — no se obtiene push token real");
    return null;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C8102E",
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("[push] permiso denegado");
    return null;
  }
  if (!env.easProjectId) {
    console.log("[push] EAS_PROJECT_ID no configurado — push deshabilitado en dev");
    return null;
  }
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: env.easProjectId,
    });
    const token = tokenData.data;
    await updateDoc(userDoc(uid), { expoPushTokens: arrayUnion(token) });
    return token;
  } catch (e) {
    console.warn("[push] error obteniendo token", e);
    return null;
  }
}
