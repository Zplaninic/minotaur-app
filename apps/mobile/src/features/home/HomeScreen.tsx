import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { t } from "../../lib/messages";
import { colors, fonts, fontSizes, headingLineHeight } from "../../theme/tokens";

export const HomeScreen = () => {
  const router = useRouter();
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        {t("app.name")}
      </Text>
      <Button label={t("home.members")} onPress={() => router.push("/members")} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.xxl,
    lineHeight: headingLineHeight(fontSizes.xxl),
  },
});
