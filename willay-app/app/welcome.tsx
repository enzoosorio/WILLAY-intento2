import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/theme/colors";

export default function Welcome() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.logo}>Willay</Text>

        <Text style={styles.subtitle}>
          Sistema Inteligente de Seguridad Ciudadana
        </Text>

        <View style={styles.buttons}>
          <PrimaryButton
            title="Ingresar como Vecino"
            onPress={() => router.push("/(auth)/sign-in")}
          />

          <PrimaryButton
            title="Ingresar como Operador"
            variant="ghost"
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 30,
  },

  logo: {
    color: colors.text,
    fontSize: 54,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 16,
  },

  buttons: {
    gap: 16,
  },
});