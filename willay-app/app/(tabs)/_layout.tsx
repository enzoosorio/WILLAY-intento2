import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const isOperator = profile?.role === "operator";

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Pánico", tabBarIcon: tabIcon("alert-circle") }}
      />
      <Tabs.Screen
        name="report"
        options={{ title: "Reportar", tabBarIcon: tabIcon("create") }}
      />
      <Tabs.Screen
        name="missing"
        options={{ title: "Fichas", tabBarIcon: tabIcon("person-circle") }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{ title: "Mis reportes", tabBarIcon: tabIcon("list") }}
      />
      <Tabs.Screen
        name="operator"
        options={{
          title: "Operador",
          tabBarIcon: tabIcon("shield-checkmark"),
          // Tab oculto si no sos operator. La ruta sigue existiendo (deep link
          // funcionaría) pero no aparece en la barra.
          href: isOperator ? "/(tabs)/operator" : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: tabIcon("person") }}
      />
    </Tabs>
  );
}
