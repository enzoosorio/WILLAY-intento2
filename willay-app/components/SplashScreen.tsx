// ════════════════════════════════════════════════════════════════════
// UBICACIÓN: willay-app/components/SplashScreen.tsx
// Splash screen animado con logo de Willay
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from "react";
import {
  Animated, Dimensions, Easing, Image,
  StyleSheet, Text, View,
} from "react-native";
import { colors } from "@/theme/colors";

const { width, height } = Dimensions.get("window");

interface Props {
  onFinish: () => void;
}

export function WillaySplash({ onFinish }: Props) {
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo aparece con scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, tension: 60, friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // 2. Glow pulsante
      Animated.timing(glowAnim, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
      }),
      // 3. Texto aparece
      Animated.timing(textOpacity, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
      }),
      // 4. Tagline aparece
      Animated.timing(tagOpacity, {
        toValue: 1, duration: 300,
        useNativeDriver: true,
      }),
      // 5. Pausa
      Animated.delay(800),
      // 6. Todo desaparece
      Animated.parallel([
        Animated.timing(logoOpacity,  { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(textOpacity,  { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(tagOpacity,   { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => onFinish());
  }, []);

  const glowStyle = {
    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
    transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) }],
  };

  return (
    <View style={styles.container}>
      {/* Fondo con gradiente simulado */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      {/* Glow detrás del logo */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Logo */}
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image
          source={require("../assets/images/logo_willay.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: tagOpacity, alignItems: "center", gap: 4 }}>
        <Text style={styles.tagline}>PUENTE PIEDRA</Text>
        <Text style={styles.subtitle}>Más seguridad, mejor comunidad</Text>
      </Animated.View>

      {/* Puntos de carga */}
      <Animated.View style={[styles.dotsWrap, { opacity: textOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.dots}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  bgTop: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: height * 0.4,
    backgroundColor: colors.brand,
    opacity: 0.04,
    borderBottomLeftRadius: width,
    borderBottomRightRadius: width,
  },
  bgBottom: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: height * 0.2,
    backgroundColor: colors.brand,
    opacity: 0.03,
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.brand,
  },
  logo: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: "hidden",
  },
  tagline: {
    color: "#F5A524",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  dotsWrap: {
    position: "absolute",
    bottom: 60,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
});