import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, spacing } from "../theme/tokens";

type ScreenProps = {
  children: ReactNode;
  // Below a navigation header the top inset is already taken care of.
  belowHeader?: boolean;
};

const allEdges: Edge[] = ["top", "right", "bottom", "left"];
const edgesBelowHeader: Edge[] = ["right", "bottom", "left"];

// Safe areas, keyboard avoidance and scrolling, so content stays reachable on
// small phones, with the keyboard open, and with large system font sizes.
export const Screen = ({ children, belowHeader = false }: ScreenProps) => (
  <SafeAreaView style={styles.safeArea} edges={belowHeader ? edgesBelowHeader : allEdges}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige10,
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing[6],
    padding: spacing[4],
  },
});
