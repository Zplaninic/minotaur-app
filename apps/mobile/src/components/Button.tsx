import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  bodyLineHeight,
  borders,
  colors,
  fonts,
  fontSizes,
  minTouchSize,
  opacity,
  radii,
  spacing,
} from "../theme/tokens";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  // While the action runs: disabled, with a spinner before the label.
  pending?: boolean;
  accessibilityLabel?: string;
};

export const Button = ({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  pending = false,
  accessibilityLabel,
}: ButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || pending}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: disabled || pending, busy: pending }}
    style={({ pressed }) => [
      styles.button,
      variant === "primary" ? styles.primary : styles.secondary,
      pressed && (variant === "primary" ? styles.primaryPressed : styles.secondaryPressed),
      // A running action is not unavailable, so it keeps full contrast.
      disabled && !pending && styles.disabled,
    ]}
  >
    <View style={styles.content}>
      {pending ? <ActivityIndicator size="small" color={variant === "primary" ? colors.beige10 : colors.greenDark} /> : null}
      <Text style={[styles.label, variant === "primary" ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchSize,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderWidth: borders.width,
    borderColor: colors.greenDark,
    borderRadius: radii.pill,
  },
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  primary: {
    backgroundColor: colors.greenDark,
  },
  primaryPressed: {
    backgroundColor: colors.greenDark90,
  },
  secondary: {
    backgroundColor: colors.beige10,
  },
  secondaryPressed: {
    backgroundColor: colors.greenLight30,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
    textAlign: "center",
  },
  primaryLabel: {
    color: colors.beige10,
  },
  secondaryLabel: {
    color: colors.greenDark,
  },
});
