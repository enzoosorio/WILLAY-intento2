import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { useAuthUser, useUserDoc } from "@/lib/session";
import { colors } from "@/theme/colors";

export default function Index() {
  const router = useRouter();

  const { user, loading } = useAuthUser();
  const { data: profile, loading: profileLoading } =
    useUserDoc(user?.uid);

  useEffect(() => {
    if (loading) return;

    // NO LOGIN
    if (!user) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (profileLoading) return;

    // SIN ROL
    if (!profile?.role) {
      router.replace("/(auth)/role-select");
      return;
    }

    // ADMIN
    if (profile.role === "operator") {
      router.replace("/(tabs)/operator");
      return;
    }

    // VECINO
    router.replace("/(tabs)");
  }, [user, loading, profile, profileLoading]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bg,
      }}
    >
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}