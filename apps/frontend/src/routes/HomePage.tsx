import { useAbility } from "../api/auth";
import { Logo } from "../components/Logo";
import { MonthOverview } from "../features/dashboard/MonthOverview";
import { NeedsAttention } from "../features/dashboard/NeedsAttention";
import { TodayTrainings } from "../features/dashboard/TodayTrainings";
import { useMessages } from "../lib/messages";
import styles from "./HomePage.module.css";

export const HomePage = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const canReadAttendance = ability.can("read", "Attendance");

  return (
    <div className={styles.page}>
      <h1 className={styles.hero}>
        <Logo variant="app" alt={t("app.name")} />
      </h1>
      {canReadAttendance ? (
        <div className={styles.dashboard}>
          {ability.can("read", "Group") ? <TodayTrainings /> : null}
          <NeedsAttention />
          <MonthOverview />
        </div>
      ) : null}
    </div>
  );
};
