// Ruta de fallback para cualquier URL no reconocida por Expo Router.
// Expo Router 6 la necesita; sin ella, un deep link erróneo crashea.
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Página no encontrada" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Esta pantalla no existe.</Text>
        <Link href="/(tabs)" style={styles.link}>
          Volver al inicio
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 16 },
  link: { color: colors.brand, fontSize: 15 },
});
