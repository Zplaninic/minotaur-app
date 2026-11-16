import { Pressable, StyleSheet, Text } from "react-native";
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
  accessibilityLabel?: string;
};

export const Button = ({ label, onPress, variant = "primary", disabled = false, accessibilityLabel }: ButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled }}
    style={({ pressed }) => [
      styles.button,
      variant === "primary" ? styles.primary : styles.secondary,
      pressed && (variant === "primary" ? styles.primaryPressed : styles.secondaryPressed),
      disabled && styles.disabled,
    ]}
  >
    <Text style={[styles.label, variant === "primary" ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
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
