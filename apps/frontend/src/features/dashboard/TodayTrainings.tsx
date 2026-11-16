import { groupsTrainingOn } from "@repo/shared/client";
import { Link } from "@tanstack/react-router";
import { useMe } from "../../api/auth";
import { useDashboard } from "../../api/dashboard";
import { useGroups } from "../../api/groups";
import { formatNumber, formatPersonName, formatTimeOfDay } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./Dashboard.module.css";
import { SectionError } from "./SectionError";

// The groups training today at the gym, the viewer's own first. Each links to its attendance.
export const TodayTrainings = () => {
  const { t } = useMessages();
  const me = useMe();
  const dashboard = useDashboard();
  const groups = useGroups();

  const body = () => {
    if (dashboard.isPending || groups.isPending) {
      return <output>{t("dashboard.today.loading")}</output>;
    }
    if (dashboard.isError || groups.isError) {
      return (
        <SectionError
          error={dashboard.error ?? groups.error}
          onRetry={() => {
            void dashboard.refetch();
            void groups.refetch();
          }}
        />
      );
    }
    const { today, month } = dashboard.data;
    const trainings = groupsTrainingOn(groups.data.items, today, me.data?.memberId);
    if (trainings.length === 0) {
      return <p>{t("dashboard.today.empty")}</p>;
    }
    return (
      <ul className={styles.list}>
        {trainings.map((group) => (
          <li key={group.id} className={styles.item}>
            <Link to="/groups/$groupId/attendance" params={{ groupId: group.id }} search={{ month }}>
              {t("dashboard.today.training", {
                from: formatTimeOfDay(group.from),
                to: formatTimeOfDay(group.to),
                trainer: formatPersonName(group.owner),
              })}
            </Link>
            <span className={styles.detail}>
              {t("dashboard.today.members", { count: formatNumber(group.memberCount) })}
            </span>
            {group.owner.id === me.data?.memberId ? <span className={styles.mine}>{t("dashboard.today.mine")}</span> : null}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className={styles.section} aria-labelledby="today-title">
      <h2 id="today-title">{t("dashboard.today.title")}</h2>
      {body()}
    </section>
  );
};
