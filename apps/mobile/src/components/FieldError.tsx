import { StyleSheet, Text } from "react-native";
import { bodyLineHeight, colors, fonts, fontSizes, radii, spacing } from "../theme/tokens";

type FieldErrorProps = {
  error: string | undefined;
};

// Red on its own fails contrast for small text, so the message is green-dark on a red tint.
export const FieldError = ({ error }: FieldErrorProps) =>
  error ? (
    <Text style={styles.error} accessibilityLiveRegion="polite">
      {error}
    </Text>
  ) : null;

const styles = StyleSheet.create({
  error: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
});
