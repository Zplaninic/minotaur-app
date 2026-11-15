import { Link } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { t } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";

export const NotFoundScreen = () => (
  <Screen>
    <Text accessibilityRole="header" style={styles.title}>
      {t("notFound.title")}
    </Text>
    <Link href="/" accessibilityRole="link" accessibilityLabel={t("notFound.home")} style={styles.link}>
      {t("notFound.home")}
    </Link>
  </Screen>
);

const styles = StyleSheet.create({
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.xl,
    lineHeight: headingLineHeight(fontSizes.xl),
  },
  link: {
    minHeight: spacing[12],
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
    textDecorationLine: "underline",
  },
});
