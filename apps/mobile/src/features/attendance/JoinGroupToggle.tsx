import { Pressable, StyleSheet, Text, View } from "react-native";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../../theme/tokens";

type JoinGroupToggleProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

export const JoinGroupToggle = ({ label, checked, onToggle }: JoinGroupToggleProps) => (
  <Pressable
    onPress={onToggle}
    accessibilityRole="checkbox"
    accessibilityLabel={label}
    accessibilityState={{ checked }}
    style={styles.row}
  >
    <View style={[styles.box, checked && styles.boxChecked]} />
    <Text style={styles.text}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  box: {
    width: spacing[4],
    height: spacing[4],
    borderRadius: spacing[1],
    borderWidth: borders.width,
    borderColor: colors.greenDark,
  },
  boxChecked: {
    backgroundColor: colors.greenDark,
  },
  text: {
    flexShrink: 1,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
