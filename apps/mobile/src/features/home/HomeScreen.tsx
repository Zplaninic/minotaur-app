import { StyleSheet, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { t } from "../../lib/messages";
import { colors, fonts, fontSizes, headingLineHeight } from "../../theme/tokens";

export const HomeScreen = () => (
  <Screen>
    <Text accessibilityRole="header" style={styles.title}>
      {t("app.name")}
    </Text>
  </Screen>
);

const styles = StyleSheet.create({
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.xxl,
    lineHeight: headingLineHeight(fontSizes.xxl),
  },
});
