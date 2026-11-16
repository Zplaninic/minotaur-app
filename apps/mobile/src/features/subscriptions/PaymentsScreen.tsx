import type { OverduePaymentsResponse, SubscriptionSummaryResponse } from "@repo/shared";
import { hasPreviousMonth, shiftMonth, toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOverduePayments, useSubscriptionSummary } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { formatMoney, formatMonth, formatNumber, formatSortedName } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import { useManualRefresh } from "../../lib/useManualRefresh";
import { useToday } from "../../lib/useToday";
import {
  bodyLineHeight,
  borders,
  colors,
  fonts,
  fontSizes,
  headingLineHeight,
  minTouchSize,
  opacity,
  spacing,
} from "../../theme/tokens";

type SubscriptionRow = SubscriptionSummaryResponse["bySubscription"][number];
type OverdueRow = OverduePaymentsResponse["items"][number];
type Row = { kind: "subscription"; row: SubscriptionRow } | { kind: "overdue"; row: OverdueRow };

type PaymentsScreenProps = {
  // Tests pass a fixed moment.
  now?: Date;
};

// One month's money, with ‹ › between months, and the members who have not
// paid for a past month.
export const PaymentsScreen = ({ now }: PaymentsScreenProps) => {
  const today = useToday(now);
  // An ISO date starts with its month.
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const summary = useSubscriptionSummary(month);
  const overdue = useOverduePayments();
  const { refreshing, onRefresh } = useManualRefresh(() => Promise.all([summary.refetch(), overdue.refetch()]));
  // Next month can already have subscriptions; later ones cannot.
  const canGoForward = month < shiftMonth(currentMonth, 1);
  const canGoBack = hasPreviousMonth(month);

  const state = (query: typeof summary | typeof overdue, loading: string) => {
    if (query.isPending) {
      return (
        <View style={styles.state} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.greenDark} />
          <Text style={styles.text}>{loading}</Text>
        </View>
      );
    }
    if (query.isError) {
      const code = toErrorCode(query.error);
      return (
        <View style={styles.state} accessibilityLiveRegion="polite">
          {code === "NETWORK_ERROR" ? (
            <Text accessibilityRole="header" style={styles.title}>
              {t("payments.offlineTitle")}
            </Text>
          ) : null}
          <Text style={styles.text}>{errorMessage(code)}</Text>
          <Button label={t("common.retry")} variant="secondary" onPress={() => void query.refetch()} />
        </View>
      );
    }
    return null;
  };

  const figures = summary.data
    ? [
        [t("payments.members"), formatNumber(summary.data.members)],
        [t("payments.paid"), formatNumber(summary.data.paid)],
        [t("payments.unpaid"), formatNumber(summary.data.unpaid)],
        [t("payments.expected"), formatMoney(summary.data.expected)],
        [t("payments.collected"), formatMoney(summary.data.collected)],
        [t("payments.open"), formatMoney(summary.data.open)],
      ]
    : [];

  const header = (
    <View>
      <View style={styles.nav}>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, -1))}
          disabled={!canGoBack}
          accessibilityRole="button"
          accessibilityLabel={t("payments.previousMonth")}
          accessibilityState={{ disabled: !canGoBack }}
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed, !canGoBack && styles.arrowDisabled]}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.navLabel}>
          {formatMonth(month)}
        </Text>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, 1))}
          disabled={!canGoForward}
          accessibilityRole="button"
          accessibilityLabel={t("payments.nextMonth")}
          accessibilityState={{ disabled: !canGoForward }}
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed, !canGoForward && styles.arrowDisabled]}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      {state(summary, t("payments.loading")) ??
        (summary.data?.members === 0 ? (
          <View style={styles.state}>
            <Text style={styles.text}>{t("payments.empty", { month: formatMonth(month) })}</Text>
          </View>
        ) : (
          <View style={styles.figures}>
            {figures.map(([label, value]) => (
              <View key={label} style={styles.figure}>
                <Text style={styles.small}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>
        ))}
    </View>
  );

  const sections = [
    {
      key: "subscriptions",
      title: summary.data && summary.data.members > 0 ? t("payments.bySubscription") : undefined,
      data: (summary.data?.bySubscription ?? []).map((row): Row => ({ kind: "subscription", row })),
    },
    {
      key: "overdue",
      title: t("overdue.title"),
      data: (overdue.data?.items ?? []).map((row): Row => ({ kind: "overdue", row })),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}-${item.row.id}`}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.title}>
                {section.title}
              </Text>
              {section.key === "overdue"
                ? (state(overdue, t("payments.loading")) ??
                  (overdue.data?.items.length === 0 ? (
                    <Text style={styles.text}>{t("overdue.empty")}</Text>
                  ) : (
                    <Text style={styles.strong}>
                      {t("overdue.total", { total: formatMoney(overdue.data?.total ?? 0) })}
                    </Text>
                  )))
                : null}
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          item.kind === "subscription" ? (
            <View style={styles.row}>
              <Text style={styles.strong}>{item.row.name}</Text>
              <Text style={styles.small}>
                {t("payments.subscriptionDetail", {
                  paid: formatNumber(item.row.paid),
                  members: formatNumber(item.row.members),
                  collected: formatMoney(item.row.collected),
                  expected: formatMoney(item.row.expected),
                })}
              </Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.strong}>{formatSortedName(item.row)}</Text>
              {item.row.months.map((entry) => (
                <Text key={entry.month} style={styles.small}>
                  {t("overdue.month", {
                    month: formatMonth(entry.month),
                    subscription: entry.subscription.name,
                    price: formatMoney(entry.price),
                  })}
                </Text>
              ))}
              <Text style={styles.small}>{t("overdue.memberTotal", { total: formatMoney(item.row.total) })}</Text>
            </View>
          )
        }
        stickySectionHeadersEnabled={false}
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
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    padding: spacing[4],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
  },
  arrow: {
    minWidth: minTouchSize,
    minHeight: minTouchSize,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borders.width,
    borderColor: colors.greenDark,
    backgroundColor: colors.beige10,
  },
  arrowPressed: {
    backgroundColor: colors.greenDark10,
  },
  arrowDisabled: {
    opacity: opacity.disabled,
  },
  arrowText: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.xl,
    lineHeight: bodyLineHeight(fontSizes.xl),
  },
  navLabel: {
    flex: 1,
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
    textAlign: "center",
  },
  figures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
    padding: spacing[4],
  },
  figure: {
    flexGrow: 1,
    flexBasis: "40%",
    gap: spacing[1],
    padding: spacing[3],
    borderWidth: borders.width,
    borderColor: colors.greenDark30,
  },
  value: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.lg,
    lineHeight: bodyLineHeight(fontSizes.lg),
  },
  sectionHeader: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[3],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
  },
  row: {
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
    padding: spacing[4],
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
  strong: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  small: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
});
