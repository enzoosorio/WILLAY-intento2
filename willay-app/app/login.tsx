import { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";

import { signInAnonymously } from "firebase/auth";
import { router } from "expo-router";

import { getFirebaseAuth } from "@/lib/firebase";
import { Screen } from "@/components/ui/Screen";
import { colors } from "@/theme/colors";

export default function LoginScreen() {
  const auth = getFirebaseAuth();

  const [loadingGuest, setLoadingGuest] = useState(false);

  async function handleGuestLogin() {
    setLoadingGuest(true);

    try {
      await signInAnonymously(auth);

      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert(
        "Error",
        "No se pudo iniciar sesión."
      );
    } finally {
      setLoadingGuest(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.logo}>
          WILLAY
        </Text>

        <Text style={styles.subtitle}>
          Sistema Inteligente de Seguridad Ciudadana
        </Text>

        <Pressable
          style={styles.guestButton}
          onPress={handleGuestLogin}
        >
          {loadingGuest ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              Entrar como Invitado
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.googleButton}>
          <Text style={styles.googleText}>
            Continuar con Google
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 20,
  },

  logo: {
    fontSize: 42,
    fontWeight: "900",
    color: colors.text,
  },

  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 15,
  },

  guestButton: {
    width: "100%",
    backgroundColor: colors.brand,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  googleButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.brand,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },

  googleText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
});