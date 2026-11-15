import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAbility, useLogout, useMe } from "../../api/auth";
import { Button } from "../../components/Button";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { t } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, spacing } from "../../theme/tokens";

export const HomeScreen = () => {
  const router = useRouter();
  const me = useMe();
  const ability = useAbility();
  const logout = useLogout();

  return (
    <Screen>
      <Logo variant="app" label={t("app.name")} isHeader />
      {me.data ? (
        <Text style={styles.text}>{t("home.loggedInAs", { name: `${me.data.name} ${me.data.surname}` })}</Text>
      ) : null}
      {ability.can("read", "Member") ? (
        <Button label={t("home.members")} onPress={() => router.push("/members")} />
      ) : null}
      <View style={styles.footer}>
        <Button
          label={t("home.logout")}
          variant="secondary"
          onPress={() => logout.mutate()}
          disabled={logout.isPending}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  text: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  footer: {
    marginTop: "auto",
    paddingTop: spacing[6],
  },
});
