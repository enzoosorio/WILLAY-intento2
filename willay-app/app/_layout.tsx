import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import "react-native-reanimated";

import { bootstrapFirebase } from "@/lib/firebase";
import { ensureUserDoc, useAuthUser, useUserDoc } from "@/lib/session";
import { registerForPushAsync } from "@/lib/push";
import { WillaySplash } from "@/components/SplashScreen";
import { colors } from "@/theme/colors";

bootstrapFirebase();

let pushRegisteredOnce = false;
let splashShownOnce = false;

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const { user, loading: authLoading } = useAuthUser();
  const { data: profile, loading: profileLoading } = useUserDoc(user?.uid);
  const segments = useSegments();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(!splashShownOnce);

  useEffect(() => {
    if (!user || pushRegisteredOnce) return;
    pushRegisteredOnce = true;
    if (!user.isAnonymous) {
      ensureUserDoc(user)
        .then(() => registerForPushAsync(user.uid))
        .catch((e) => console.warn("[layout] post-login error", e));
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user && profileLoading) return;

    const inAuth = segments[0] === "(auth)";
    const currentScreen = segments[1];

    if (!user) {
      if (segments[0] !== "(auth)") router.replace("/(auth)/login");
      return;
    }

    if (!profile?.onboardingDone) {
      if (user.isAnonymous) {
        if (segments[1] !== "role-select") router.replace("/(auth)/role-select");
      } else {
        if (segments[1] !== "onboarding") router.replace("/(auth)/onboarding");
      }
      return;
    }

    // Logueado y onboarding listo → fuera de (auth)
    if (inAuth) {
      if (profile?.role === "operator") {
        router.replace("/(tabs)/operator");
      } else {
        router.replace("/(tabs)");
      }
      return;
    }

    // Ya en (tabs) — no redirigir, dejar que cada pantalla maneje su rol
  }, [authLoading, profileLoading, user, profile, segments, router]);

  if (showSplash) {
    return <WillaySplash onFinish={() => { splashShownOnce = true; setShowSplash(false); }} />;
  }

  if (authLoading || (user && profileLoading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="report/[id]" options={{ title: "Reporte" }} />
        <Stack.Screen name="missing/new" options={{ title: "Nueva ficha" }} />
        <Stack.Screen name="missing/scan" options={{ title: "Avistamiento" }} />
        <Stack.Screen name="missing/[id]" options={{ title: "Ficha" }} />
        <Stack.Screen name="localizar/[id]" options={{ title: "Localizar persona" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacidad" }} />
        <Stack.Screen name="willay-bot" options={{ headerShown: false }} />
        <Stack.Screen name="ia-stats" options={{ headerShown: false }} />
        <Stack.Screen name="export-pdf" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}