import { DEFAULT_PAGE_SIZE, MAX_MEMBER_SEARCH_LENGTH } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAbility } from "../../api/auth";
import { useMemberPages } from "../../api/members";
import { Button } from "../../components/Button";
import { CheckboxList } from "../../components/CheckboxList";
import { TextField } from "../../components/TextField";
import { useMessages } from "../../lib/messages";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useManualRefresh } from "../../lib/useManualRefresh";
import { bodyLineHeight, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { MemberRow } from "./MemberRow";

type ListStateProps = {
  unpaidOnly: boolean;
  search: string;
};

const ListState = ({ unpaidOnly, search }: ListStateProps) => {
  const { errorMessage, t } = useMessages();
  const members = useMemberPages(DEFAULT_PAGE_SIZE, unpaidOnly, search);

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
      <Text style={styles.stateText}>
        {search ? t("members.searchEmpty") : unpaidOnly ? t("members.unpaidEmpty") : t("members.empty")}
      </Text>
    </View>
  );
};

export const MembersScreen = () => {
  const { t } = useMessages();
  const router = useRouter();
  const ability = useAbility();
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const members = useMemberPages(DEFAULT_PAGE_SIZE, unpaidOnly, debouncedSearch);
  const items = members.data?.pages.flatMap((page) => page.items) ?? [];
  const { refreshing, onRefresh } = useManualRefresh(members.refetch);

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <FlatList
        data={items}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            onEdit={
              ability.can("update", "Member")
                ? () => router.push({ pathname: "/members/[id]/edit", params: { id: item.id } })
                : undefined
            }
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            {ability.can("create", "Member") ? (
              <Button label={t("members.add")} onPress={() => router.push("/members/new")} />
            ) : null}
            <TextField
              label={t("members.search")}
              value={search}
              onChangeText={setSearch}
              maxLength={MAX_MEMBER_SEARCH_LENGTH}
              autoCapitalize="none"
              inputMode="search"
            />
            {ability.can("read", "Subscription") ? (
              <CheckboxList
                label={t("members.filter")}
                options={[{ value: "unpaid", label: t("members.unpaidOnly") }]}
                selected={unpaidOnly ? ["unpaid"] : []}
                onToggle={() => setUnpaidOnly(!unpaidOnly)}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={<ListState unpaidOnly={unpaidOnly} search={debouncedSearch} />}
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
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige40,
  },
  content: {
    flexGrow: 1,
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  header: {
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
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
