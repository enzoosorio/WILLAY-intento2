import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const { user } = useAuthUser();
  const { data: profile } = useUserDoc(user?.uid);
  const isOperator = profile?.role === "operator";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarItemStyle: { paddingHorizontal: 2 },
      }}
    >
      {/* ════════ VECINO ════════ */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: tabIcon("home"),
          href: isOperator ? null : "/(tabs)",
        }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          title: "Historial",
          tabBarIcon: tabIcon("list"),
          href: isOperator ? null : "/(tabs)/my-reports",
        }}
      />
      <Tabs.Screen
        name="missing"
        options={{
          title: "Personas",
          tabBarIcon: tabIcon("people"),
          href: null,
        }}
      />
      {/* Accesible desde el grid, oculta en tab bar */}
      <Tabs.Screen
        name="report"
        options={{
          title: "Reportar",
          tabBarIcon: tabIcon("create"),
          href: null,
        }}
      />

      {/* ════════ ADMIN ════════ */}
      <Tabs.Screen
        name="operator"
        options={{
          title: "Alertas",
          tabBarIcon: tabIcon("shield-checkmark"),
          tabBarActiveTintColor: colors.warning,
          href: isOperator ? "/(tabs)/operator" : null,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: "Mapa",
          tabBarIcon: tabIcon("map"),
          tabBarActiveTintColor: colors.warning,
          href: isOperator ? "/(tabs)/mapa" : null,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: tabIcon("stats-chart"),
          tabBarActiveTintColor: colors.warning,
          href: isOperator ? "/(tabs)/dashboard" : null,
        }}
      />
      {/* NUEVA: el admin ve todas las personas y puede BUSCAR por rostro */}
      <Tabs.Screen
        name="buscar"
        options={{
          title: "Buscar",
          tabBarIcon: tabIcon("scan-circle"),
          tabBarActiveTintColor: colors.warning,
          href: isOperator ? "/(tabs)/buscar" : null,
        }}
      />

      {/* ════════ PERFIL (ambos) ════════ */}
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: tabIcon("person") }}
      />
    </Tabs>
  );
}