import { DEFAULT_PAGE_SIZE } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemberPages } from "../../api/members";
import { Button } from "../../components/Button";
import { errorMessage, t } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { MemberRow } from "./MemberRow";

const ListState = () => {
  const members = useMemberPages(DEFAULT_PAGE_SIZE);

  if (members.isPending) {
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.greenDark} />
        <Text style={styles.stateText}>{t("members.loading")}</Text>
      </View>
    );
  }
  if (members.isError) {
    const code = toErrorCode(members.error);
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        {code === "NETWORK_ERROR" ? (
          <Text accessibilityRole="header" style={styles.stateTitle}>
            {t("members.offlineTitle")}
          </Text>
        ) : null}
        <Text style={styles.stateText}>{errorMessage(code)}</Text>
        <Button label={t("common.retry")} variant="secondary" onPress={() => void members.refetch()} />
      </View>
    );
  }
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{t("members.empty")}</Text>
    </View>
  );
};

export const MembersScreen = () => {
  const router = useRouter();
  const members = useMemberPages(DEFAULT_PAGE_SIZE);
  const items = members.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <FlatList
        data={items}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => <MemberRow member={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button label={t("members.add")} onPress={() => router.push("/members/new")} />
          </View>
        }
        ListEmptyComponent={<ListState />}
        ListFooterComponent={
          members.isFetchingNextPage ? (
            <View style={styles.footer} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.greenDark} accessibilityLabel={t("members.loadingMore")} />
            </View>
          ) : undefined
        }
        onEndReached={() => {
          if (members.hasNextPage && !members.isFetchingNextPage) {
            void members.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshing={members.isRefetching && !members.isFetchingNextPage}
        onRefresh={() => void members.refetch()}
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
  footer: {
    padding: spacing[4],
  },
});
