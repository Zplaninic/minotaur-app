import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../theme/tokens";

type ScreenProps = {
  children: ReactNode;
};

// Safe areas plus scrolling, so content stays reachable on small phones and
// with large system font sizes.
export const Screen = ({ children }: ScreenProps) => (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige10,
  },
  content: {
    flexGrow: 1,
    gap: spacing[6],
    padding: spacing[4],
  },
});
