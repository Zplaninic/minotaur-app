import { groupsTrainingOn } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useMe } from "../../api/auth";
import { useDashboard } from "../../api/dashboard";
import { useGroups } from "../../api/groups";
import { Button } from "../../components/Button";
import { formatNumber, formatPersonName, formatTimeOfDay } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { MAX_DASHBOARD_ROWS, dashboardStyles as styles } from "./dashboardStyles";
import { SectionState } from "./SectionState";

// The groups training today at the gym, the viewer's own first. Each opens its attendance.
export const TodayTrainings = () => {
  const { t } = useMessages();
  const router = useRouter();
  const me = useMe();
  const dashboard = useDashboard();
  const groups = useGroups();

  const body = () => {
    if (dashboard.isPending || groups.isPending) {
      return <SectionState kind="loading" label={t("dashboard.today.loading")} />;
    }
    if (dashboard.isError || groups.isError) {
      return (
        <SectionState
          kind="error"
          error={dashboard.error ?? groups.error}
          onRetry={() => {
            void dashboard.refetch();
            void groups.refetch();
          }}
        />
      );
    }
    const trainings = groupsTrainingOn(groups.data.items, dashboard.data.today, me.data?.memberId);
    if (trainings.length === 0) {
      return <Text style={styles.text}>{t("dashboard.today.empty")}</Text>;
    }
    const hidden = trainings.length - MAX_DASHBOARD_ROWS;
    return (
      <>
        {trainings.slice(0, MAX_DASHBOARD_ROWS).map((group) => {
          const label = t("dashboard.today.training", {
            from: formatTimeOfDay(group.from),
            to: formatTimeOfDay(group.to),
            trainer: formatPersonName(group.owner),
          });
          const isMine = group.owner.id === me.data?.memberId;
          return (
            <Pressable
              key={group.id}
              onPress={() => router.push({ pathname: "/groups/[id]/attendance", params: { id: group.id } })}
              accessibilityRole="link"
              accessibilityLabel={t("dashboard.today.open", { name: label })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.strong}>{label}</Text>
              <Text style={styles.small}>{t("dashboard.today.members", { count: formatNumber(group.memberCount) })}</Text>
              {isMine ? (
                <View style={styles.mine}>
                  <Text style={styles.small}>{t("dashboard.today.mine")}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {hidden > 0 ? (
          <Button
            label={t("dashboard.today.more", { count: formatNumber(hidden) })}
            variant="secondary"
            onPress={() => router.push("/groups")}
          />
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("dashboard.today.title")}
      </Text>
      {body()}
    </View>
  );
};
