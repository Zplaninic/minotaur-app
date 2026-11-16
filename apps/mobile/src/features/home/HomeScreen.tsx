import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAbility, useLogout, useMe } from "../../api/auth";
import { Button } from "../../components/Button";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { useMessages } from "../../lib/messages";
import { MonthOverview } from "./MonthOverview";
import { NeedsAttention } from "./NeedsAttention";
import { TodayTrainings } from "./TodayTrainings";
import { bodyLineHeight, colors, fonts, fontSizes, radii, spacing } from "../../theme/tokens";

export const HomeScreen = () => {
  const { t } = useMessages();
  const router = useRouter();
  const me = useMe();
  const ability = useAbility();
  const logout = useLogout();

  return (
    <Screen>
      <View style={styles.hero}>
        <Logo variant="app" label={t("app.name")} isHeader />
      </View>
      {me.data ? (
        <Text style={styles.text}>{t("home.loggedInAs", { name: `${me.data.name} ${me.data.surname}` })}</Text>
      ) : null}
      {ability.can("read", "Attendance") ? (
        <>
          {ability.can("read", "Group") ? <TodayTrainings /> : null}
          <NeedsAttention />
          <MonthOverview />
        </>
      ) : null}
      {ability.can("read", "Member") ? (
        <Button label={t("home.members")} onPress={() => router.push("/members")} />
      ) : null}
      {ability.can("read", "Group") ? (
        <Button label={t("home.groups")} onPress={() => router.push("/groups")} />
      ) : null}
      {ability.can("read", "Subscription") ? (
        <Button label={t("home.subscriptions")} onPress={() => router.push("/subscriptions")} />
      ) : null}
      <View style={styles.footer}>
        <LanguageSwitcher />
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
  // The logo files are made for light backgrounds; green-light is one of them.
  hero: {
    paddingVertical: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: colors.greenLight30,
  },
  text: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  footer: {
    gap: spacing[4],
    marginTop: "auto",
    paddingTop: spacing[6],
  },
});
