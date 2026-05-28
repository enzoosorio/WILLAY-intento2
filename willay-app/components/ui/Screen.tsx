import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scroll = false, padded = true, style }: Props) {
  const inner = (
    <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[padded && styles.padded]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1 },
  padded: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 14 },
});
