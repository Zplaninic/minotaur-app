import { toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAbility } from "../../api/auth";
import { useSubscriptions } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { errorMessage, t } from "../../lib/messages";
import { useManualRefresh } from "../../lib/useManualRefresh";
import { bodyLineHeight, borders, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { SubscriptionRow } from "./SubscriptionRow";

const ListState = () => {
  const subscriptions = useSubscriptions();

  if (subscriptions.isPending) {
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.greenDark} />
        <Text style={styles.stateText}>{t("subscriptions.loading")}</Text>
      </View>
    );
  }
  if (subscriptions.isError) {
    const code = toErrorCode(subscriptions.error);
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        {code === "NETWORK_ERROR" ? (
          <Text accessibilityRole="header" style={styles.stateTitle}>
            {t("subscriptions.offlineTitle")}
          </Text>
        ) : null}
        <Text style={styles.stateText}>{errorMessage(code)}</Text>
        <Button label={t("common.retry")} variant="secondary" onPress={() => void subscriptions.refetch()} />
      </View>
    );
  }
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{t("subscriptions.empty")}</Text>
    </View>
  );
};

export const SubscriptionsScreen = () => {
  const router = useRouter();
  const ability = useAbility();
  const subscriptions = useSubscriptions();
  const { refreshing, onRefresh } = useManualRefresh(subscriptions.refetch);
  const canEdit = ability.can("update", "Subscription");

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <FlatList
        data={subscriptions.data?.items ?? []}
        keyExtractor={(subscription) => subscription.id}
        renderItem={({ item }) => (
          <SubscriptionRow
            subscription={item}
            onEdit={
              canEdit
                ? () => router.push({ pathname: "/subscriptions/[id]/edit", params: { id: item.id } })
                : undefined
            }
          />
        )}
        ListHeaderComponent={
          ability.can("create", "Subscription") ? (
            <View style={styles.header}>
              <Button label={t("subscriptions.add")} onPress={() => router.push("/subscriptions/new")} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={<ListState />}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige10,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing[6],
  },
  header: {
    padding: spacing[4],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
    padding: spacing[4],
  },
  stateTitle: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
  stateText: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
