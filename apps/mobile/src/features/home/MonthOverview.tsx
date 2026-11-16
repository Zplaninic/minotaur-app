import { attendanceRate } from "@repo/shared/client";
import { Text, View } from "react-native";
import { useAbility } from "../../api/auth";
import { useDashboard } from "../../api/dashboard";
import { useSubscriptionSummary } from "../../api/subscriptions";
import { formatMoney, formatNumber, formatPercent } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { dashboardStyles as styles } from "./dashboardStyles";
import { SectionState } from "./SectionState";

// The current month in a few numbers.
export const MonthOverview = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const canReadMoney = ability.can("read", "Subscription");
  const dashboard = useDashboard();
  const month = dashboard.data?.month;
  const summary = useSubscriptionSummary(month ?? "", { enabled: canReadMoney && month !== undefined });

  const body = () => {
    // The summary waits for the month from the dashboard, so the dashboard is checked first.
    if (dashboard.isPending) {
      return <SectionState kind="loading" label={t("dashboard.overview.loading")} />;
    }
    if (dashboard.isError) {
      return <SectionState kind="error" error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
    }
    if (canReadMoney && summary.isPending) {
      return <SectionState kind="loading" label={t("dashboard.overview.loading")} />;
    }
    if (canReadMoney && summary.isError) {
      return <SectionState kind="error" error={summary.error} onRetry={() => void summary.refetch()} />;
    }
    const rate = attendanceRate(dashboard.data.attendance);
    const figures: { label: string; value: string; detail?: string }[] = [
      { label: t("dashboard.overview.activeMembers"), value: formatNumber(dashboard.data.activeMembers) },
      {
        label: t("dashboard.overview.attendance"),
        value: rate === undefined ? t("common.empty") : formatPercent(rate),
      },
    ];
    if (canReadMoney && summary.data) {
      figures.push({
        label: t("dashboard.overview.collected"),
        value: formatMoney(summary.data.collected),
        detail: t("dashboard.overview.collectedOf", { expected: formatMoney(summary.data.expected) }),
      });
    }
    return (
      <View style={styles.figures}>
        {figures.map((figure) => (
          <View key={figure.label} style={styles.figure}>
            <Text style={styles.small}>{figure.label}</Text>
            <Text style={styles.value}>{figure.value}</Text>
            {figure.detail ? <Text style={styles.small}>{figure.detail}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("dashboard.overview.title")}
      </Text>
      {body()}
    </View>
  );
};
