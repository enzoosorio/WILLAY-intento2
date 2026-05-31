import { Stack } from "expo-router";
import { colors } from "@/theme/colors";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="role-select" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ title: "Bienvenido a Willay" }} />
    </Stack>
  );
}