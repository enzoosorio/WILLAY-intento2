import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { getDb } from "./firebase";

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushAsync(uid: string): Promise<string | null> {
  // Solo funciona en dispositivo físico
  if (!Device.isDevice) {
    console.log("[push] Solo funciona en dispositivo físico");
    return null;
  }

  try {
    // Solicitar permisos
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[push] Permisos denegados");
      return null;
    }

    // Obtener token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "cf1be89d-2b54-43ed-8e59-ea82d225e302",
    });
    const token = tokenData.data;
    console.log("[push] Token obtenido:", token);

    // Guardar token en Firestore
    await updateDoc(doc(getDb(), "users", uid), {
      expoPushTokens: arrayUnion(token),
    });

    return token;
  } catch (e) {
    console.warn("[push] Error al registrar:", e);
    return null;
  }
}