import type { DashboardResponse, OverduePaymentsResponse, SubscriptionSummaryResponse } from "@repo/shared";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAbility } from "../../api/auth";
import { useDashboard } from "../../api/dashboard";
import { useOverduePayments, useSubscriptionSummary } from "../../api/subscriptions";
import { formatMoney, formatMonth, formatNumber, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { MAX_DASHBOARD_ROWS, dashboardStyles as styles } from "./dashboardStyles";
import { SectionState } from "./SectionState";

type Money = { summary: SubscriptionSummaryResponse; overdue: OverduePaymentsResponse } | undefined;

const Items = ({ dashboard, money }: { dashboard: DashboardResponse; money: Money }) => {
  const { t } = useMessages();
  const router = useRouter();
  const unpaid = money?.summary.unpaid ?? 0;
  const overdue = money?.overdue.items.length ?? 0;
  const { withoutSubscription, month } = dashboard;

  if (unpaid === 0 && overdue === 0 && withoutSubscription.length === 0) {
    return <Text style={styles.text}>{t("dashboard.attention.allGood")}</Text>;
  }
  const toPayments = () => router.push("/subscriptions/payments");
  const paymentRow = (key: string, label: string) => (
    <Pressable
      key={key}
      onPress={toPayments}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, styles.warning, pressed && styles.rowPressed]}
    >
      <Text style={styles.strong}>{label}</Text>
    </Pressable>
  );
  const hidden = withoutSubscription.length - MAX_DASHBOARD_ROWS;

  return (
    <>
      {money && unpaid > 0
        ? paymentRow(
            "unpaid",
            t("dashboard.attention.unpaid", { month: formatMonth(month), count: formatNumber(unpaid) }),
          )
        : null}
      {money && overdue > 0
        ? paymentRow(
            "overdue",
            t("dashboard.attention.overdue", { count: formatNumber(overdue), total: formatMoney(money.overdue.total) }),
          )
        : null}
      {withoutSubscription.length > 0 ? (
        <>
          <Text style={styles.strong}>
            {t("dashboard.attention.noSubscription", {
              month: formatMonth(month),
              count: formatNumber(withoutSubscription.length),
            })}
          </Text>
          {withoutSubscription.slice(0, MAX_DASHBOARD_ROWS).map((member) => (
            <Pressable
              key={member.id}
              onPress={() =>
                router.push({
                  pathname: "/groups/[id]/member-subscription",
                  // The month's subscription is shared by all the member's groups; any one of them will do.
                  params: { id: member.groupIds[0] ?? "", month, memberId: member.id },
                })
              }
              accessibilityRole="link"
              accessibilityLabel={t("dashboard.attention.setSubscription", { name: formatPersonName(member) })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.text}>{formatPersonName(member)}</Text>
            </Pressable>
          ))}
          {hidden > 0 ? (
            <Text style={styles.small}>{t("dashboard.attention.more", { count: formatNumber(hidden) })}</Text>
          ) : null}
        </>
      ) : null}
    </>
  );
};

// Payments still missing and members whose month has no subscription.
export const NeedsAttention = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const canReadMoney = ability.can("read", "Subscription");
  const dashboard = useDashboard();
  const month = dashboard.data?.month;
  const summary = useSubscriptionSummary(month ?? "", { enabled: canReadMoney && month !== undefined });
  const overdue = useOverduePayments({ enabled: canReadMoney });
  const moneyQueries = canReadMoney ? [summary, overdue] : [];

  const body = () => {
    // The summary waits for the month from the dashboard, so the dashboard is checked first.
    if (dashboard.isPending) {
      return <SectionState kind="loading" label={t("dashboard.attention.loading")} />;
    }
    if (dashboard.isError) {
      return <SectionState kind="error" error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
    }
    if (moneyQueries.some((query) => query.isPending)) {
      return <SectionState kind="loading" label={t("dashboard.attention.loading")} />;
    }
    const failed = moneyQueries.filter((query) => query.isError);
    if (failed.length > 0) {
      return (
        <SectionState
          kind="error"
          error={failed[0]?.error}
          onRetry={() => failed.forEach((query) => void query.refetch())}
        />
      );
    }
    const money = summary.data && overdue.data ? { summary: summary.data, overdue: overdue.data } : undefined;
    return <Items dashboard={dashboard.data} money={canReadMoney ? money : undefined} />;
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("dashboard.attention.title")}
      </Text>
      {body()}
    </View>
  );
};
