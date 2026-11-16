import { StyleSheet } from "react-native";
import {
  bodyLineHeight,
  borders,
  colors,
  fonts,
  fontSizes,
  headingLineHeight,
  minTouchSize,
  radii,
  shadows,
  spacing,
} from "../../theme/tokens";

// Shared by the home dashboard sections.
export const dashboardStyles = StyleSheet.create({
  section: {
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: colors.beige10,
    ...shadows.raised,
  },
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
  text: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  strong: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  small: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
  row: {
    minHeight: minTouchSize,
    justifyContent: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: borders.width,
    borderColor: colors.greenDark20,
    borderRadius: radii.md,
  },
  rowPressed: {
    backgroundColor: colors.greenLight10,
  },
  warning: {
    borderColor: colors.red50,
    backgroundColor: colors.red10,
  },
  mine: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[3],
    borderRadius: radii.pill,
    backgroundColor: colors.greenLight30,
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
  },
  figures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  figure: {
    flexGrow: 1,
    flexBasis: "40%",
    gap: spacing[1],
  },
  value: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.xl,
    lineHeight: headingLineHeight(fontSizes.xl),
  },
});

// Lists on the home screen stay short; the full lists are one tap away.
export const MAX_DASHBOARD_ROWS = 5;
