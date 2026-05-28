import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

interface Props {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  style?: ViewStyle;
}

export function PrimaryButton({ title, onPress, loading, disabled, variant = "primary", style }: Props) {
  const bg = variant === "danger" ? colors.danger : variant === "ghost" ? "transparent" : colors.brand;
  const border = variant === "ghost" ? colors.border : "transparent";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  text: { color: colors.text, fontSize: 15, fontWeight: "700" },
});
