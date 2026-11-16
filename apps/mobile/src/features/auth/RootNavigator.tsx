import { toErrorCode } from "@repo/shared/client";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMe } from "../../api/auth";
import { Button } from "../../components/Button";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { errorMessage, t } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";

// Native headers only on the list and form screens; other screens draw their own heading.
const headerOptions = {
  headerShown: true,
  headerTintColor: colors.greenDark,
  headerStyle: { backgroundColor: colors.greenLight50 },
  headerTitleStyle: { fontFamily: fonts.displayBlack },
  headerBackButtonDisplayMode: "minimal",
  headerRight: () => <Logo variant="app" label={t("app.name")} compact />,
} as const;

// Shows the login screen when logged out and the app screens when logged in.
// Protected screens cannot be opened without a login, not even by a link.
export const RootNavigator = () => {
  const me = useMe();

  if (me.isPending) {
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.greenDark} />
        <Text style={styles.text}>{t("auth.checking")}</Text>
      </View>
    );
  }
  if (me.isError) {
    const code = toErrorCode(me.error);
    return (
      <Screen>
        <View style={styles.state} accessibilityLiveRegion="polite">
          {code === "NETWORK_ERROR" ? (
            <Text accessibilityRole="header" style={styles.title}>
              {t("auth.offlineTitle")}
            </Text>
          ) : null}
          <Text style={styles.text}>{errorMessage(code)}</Text>
          <Button label={t("common.retry")} variant="secondary" onPress={() => void me.refetch()} />
        </View>
      </Screen>
    );
  }

  const loggedIn = me.data !== null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={loggedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="members/index" options={{ ...headerOptions, title: t("members.title") }} />
        <Stack.Screen
          name="members/new"
          options={{ ...headerOptions, title: t("memberForm.title"), presentation: "modal" }}
        />
        <Stack.Screen
          name="members/[id]/edit"
          options={{ ...headerOptions, title: t("memberForm.editTitle"), presentation: "modal" }}
        />
        <Stack.Screen name="groups/index" options={{ ...headerOptions, title: t("groups.title") }} />
        <Stack.Screen
          name="groups/new"
          options={{ ...headerOptions, title: t("groupForm.title"), presentation: "modal" }}
        />
        <Stack.Screen name="groups/[id]/index" options={{ ...headerOptions, title: t("group.title") }} />
        <Stack.Screen name="groups/[id]/attendance" options={{ ...headerOptions, title: t("attendance.title") }} />
        <Stack.Screen
          name="groups/[id]/add-month-member"
          options={{ ...headerOptions, title: t("monthMemberForm.title"), presentation: "modal" }}
        />
        <Stack.Screen
          name="groups/[id]/add-member"
          options={{ ...headerOptions, title: t("groupMemberForm.title"), presentation: "modal" }}
        />
        <Stack.Screen
          name="groups/[id]/member-subscription"
          options={{ ...headerOptions, title: t("monthSubscriptionForm.title"), presentation: "modal" }}
        />
        <Stack.Screen name="subscriptions/index" options={{ ...headerOptions, title: t("subscriptions.title") }} />
        <Stack.Screen
          name="subscriptions/new"
          options={{ ...headerOptions, title: t("subscriptionForm.title"), presentation: "modal" }}
        />
        <Stack.Screen
          name="subscriptions/[id]/edit"
          options={{ ...headerOptions, title: t("subscriptionForm.editTitle"), presentation: "modal" }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    backgroundColor: colors.beige10,
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
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
});
