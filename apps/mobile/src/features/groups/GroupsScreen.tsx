import { toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAbility } from "../../api/auth";
import { useGroups } from "../../api/groups";
import { Button } from "../../components/Button";
import { useMessages } from "../../lib/messages";
import { useManualRefresh } from "../../lib/useManualRefresh";
import { bodyLineHeight, borders, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { GroupRow } from "./GroupRow";

const ListState = () => {
  const { errorMessage, t } = useMessages();
  const groups = useGroups();

  if (groups.isPending) {
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.greenDark} />
        <Text style={styles.stateText}>{t("groups.loading")}</Text>
      </View>
    );
  }
  if (groups.isError) {
    const code = toErrorCode(groups.error);
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        {code === "NETWORK_ERROR" ? (
          <Text accessibilityRole="header" style={styles.stateTitle}>
            {t("groups.offlineTitle")}
          </Text>
        ) : null}
        <Text style={styles.stateText}>{errorMessage(code)}</Text>
        <Button label={t("common.retry")} variant="secondary" onPress={() => void groups.refetch()} />
      </View>
    );
  }
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{t("groups.empty")}</Text>
    </View>
  );
};

export const GroupsScreen = () => {
  const { t } = useMessages();
  const router = useRouter();
  const ability = useAbility();
  const groups = useGroups();
  const { refreshing, onRefresh } = useManualRefresh(groups.refetch);

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <FlatList
        data={groups.data?.items ?? []}
        keyExtractor={(group) => group.id}
        renderItem={({ item }) => (
          <GroupRow group={item} onPress={() => router.push({ pathname: "/groups/[id]", params: { id: item.id } })} />
        )}
        ListHeaderComponent={
          ability.can("create", "Group") ? (
            <View style={styles.header}>
              <Button label={t("groups.add")} onPress={() => router.push("/groups/new")} />
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
