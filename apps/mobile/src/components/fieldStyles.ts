import { StyleSheet } from "react-native";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../theme/tokens";

// Shared by the form field components so every field looks the same.
export const fieldStyles = StyleSheet.create({
  field: {
    gap: spacing[1],
  },
  label: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  optional: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
  },
  control: {
    minHeight: minTouchSize,
    justifyContent: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: borders.width,
    borderColor: colors.greenDark60,
    backgroundColor: colors.beige10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
  },
  controlInvalid: {
    borderColor: colors.red,
  },
  value: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  placeholder: {
    color: colors.greenDark70,
  },
  hint: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
});
