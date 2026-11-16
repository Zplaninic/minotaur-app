import type { GroupAttendanceResponse, GroupResponse, Month } from "@repo/shared";
import {
  hasPreviousMonth,
  hasPreviousSession,
  isFutureDate,
  resolveSession,
  shiftMonth,
  stepSession,
  toErrorCode,
  toIsoDate,
  toMonth,
  type SessionPick,
} from "@repo/shared/client";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useGroupAttendance } from "../api/attendance";
import { useAbility } from "../api/auth";
import { useGroup } from "../api/groups";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { AddMonthMemberForm } from "../features/attendance/AddMonthMemberForm";
import { AddSessionForm } from "../features/attendance/AddSessionForm";
import navStyles from "../features/attendance/Attendance.module.css";
import { AttendanceError } from "../features/attendance/AttendanceError";
import { AttendanceGrid } from "../features/attendance/AttendanceGrid";
import { CreateMonthSessions } from "../features/attendance/CreateMonthSessions";
import { SessionChecklist } from "../features/attendance/SessionChecklist";
import { groupName } from "../features/groups/groupName";
import { formatMonth, formatSessionDate } from "../lib/format";
import { errorMessage, t } from "../lib/messages";
import { useNarrowScreen } from "../lib/useNarrowScreen";
import styles from "./AttendancePage.module.css";

const ROUTE = "/app/groups/$groupId/attendance";

export const AttendancePage = () => {
  const { groupId } = useParams({ from: ROUTE });
  const search = useSearch({ from: ROUTE });
  const navigate = useNavigate({ from: "/groups/$groupId/attendance" });
  const ability = useAbility();
  const narrow = useNarrowScreen();
  const group = useGroup(groupId);
  const [now] = useState(() => new Date());
  const month = search.month ?? toMonth(now);
  const attendance = useGroupAttendance(groupId, month);
  // Which session the phone layout shows; the wide grid shows them all.
  const [pick, setPick] = useState<SessionPick>({ kind: "latest" });
  const [dialog, setDialog] = useState<"session" | "member" | undefined>();
  const closeDialog = () => setDialog(undefined);
  const today = toIsoDate(now);

  if (!ability.can("read", "Attendance")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  const goTo = (target: Month, targetPick: SessionPick) => {
    setPick(targetPick);
    if (target !== month) {
      void navigate({ search: { month: target } });
    }
  };

  const sessions = attendance.data?.sessions ?? [];
  const session = resolveSession(sessions, pick, today);
  const step = (direction: -1 | 1) => {
    const next = stepSession(sessions, month, session?.id, direction);
    goTo(next.month, next.pick);
  };

  return (
    <div className={styles.page} data-layout="wide">
      <Link to="/groups/$groupId" params={{ groupId }} className={styles.back}>
        {t("attendance.back")}
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("attendance.title")}</h1>
          {group.isSuccess ? <p className={styles.group}>{groupName(group.data)}</p> : null}
        </div>
        <div className={styles.actions}>
          {ability.can("update", "Attendance") && sessions.length > 0 ? (
            <Button variant="secondary" onClick={() => setDialog("member")}>
              {t("attendance.addMember")}
            </Button>
          ) : null}
          {ability.can("create", "Attendance") ? (
            <Button variant="secondary" onClick={() => setDialog("session")}>
              {t("attendance.addSession")}
            </Button>
          ) : null}
        </div>
      </div>

      {narrow ? (
        <nav className={navStyles.nav} aria-label={t("attendance.sessionNav")}>
          <button
            type="button"
            className={navStyles.arrow}
            onClick={() => step(-1)}
            disabled={!hasPreviousSession(sessions, month, session?.id)}
            aria-label={t("attendance.previousSession")}
          >
            ‹
          </button>
          <p className={navStyles.navLabel} aria-live="polite">
            {session ? formatSessionDate(session.date) : formatMonth(month)}
          </p>
          <button
            type="button"
            className={navStyles.arrow}
            onClick={() => step(1)}
            aria-label={t("attendance.nextSession")}
          >
            ›
          </button>
        </nav>
      ) : (
        <nav className={navStyles.nav} aria-label={t("attendance.monthNav")}>
          {hasPreviousMonth(month) ? (
            <Link
              to="/groups/$groupId/attendance"
              params={{ groupId }}
              search={{ month: shiftMonth(month, -1) }}
              className={navStyles.arrow}
              aria-label={t("attendance.previousMonth")}
            >
              ‹
            </Link>
          ) : (
            // The first month: nothing before it.
            <button type="button" className={navStyles.arrow} disabled aria-label={t("attendance.previousMonth")}>
              ‹
            </button>
          )}
          <p className={navStyles.navLabel} aria-live="polite">
            {formatMonth(month)}
          </p>
          <Link
            to="/groups/$groupId/attendance"
            params={{ groupId }}
            search={{ month: shiftMonth(month, 1) }}
            className={navStyles.arrow}
            aria-label={t("attendance.nextMonth")}
          >
            ›
          </Link>
        </nav>
      )}

      <AttendanceError />

      <AttendanceBody
        groupId={groupId}
        month={month}
        today={today}
        narrow={narrow}
        group={group.data}
        attendance={attendance.data}
        session={session}
        loading={attendance.isPending || group.isPending}
        error={attendance.error ?? group.error}
        onRetry={() => void Promise.all([attendance.refetch(), group.refetch()])}
      />

      <Dialog open={dialog === "member"} onClose={closeDialog} title={t("monthMemberForm.title")}>
        <AddMonthMemberForm groupId={groupId} month={month} onCancel={closeDialog} onSaved={closeDialog} />
      </Dialog>

      <Dialog open={dialog === "session"} onClose={closeDialog} title={t("sessionForm.title")}>
        <AddSessionForm
          groupId={groupId}
          today={today}
          onCancel={closeDialog}
          onSaved={(created) => {
            closeDialog();
            goTo(created.date.slice(0, 7), { kind: "id", id: created.id });
          }}
        />
      </Dialog>
    </div>
  );
};

type AttendanceBodyProps = {
  groupId: string;
  month: Month;
  today: string;
  narrow: boolean;
  group: GroupResponse | undefined;
  attendance: GroupAttendanceResponse | undefined;
  session: GroupAttendanceResponse["sessions"][number] | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
};

// Loading, error and empty states, then the grid or the checklist.
const AttendanceBody = ({
  groupId,
  month,
  today,
  narrow,
  group,
  attendance,
  session,
  loading,
  error,
  onRetry,
}: AttendanceBodyProps) => {
  if (error) {
    return (
      <div className={navStyles.state} role="alert">
        <p>{errorMessage(toErrorCode(error))}</p>
        <div>
          <Button variant="secondary" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }
  if (loading || !group || !attendance) {
    return <output>{t("attendance.loading")}</output>;
  }
  if (attendance.sessions.length === 0) {
    return <CreateMonthSessions groupId={groupId} month={month} days={group.days} today={today} />;
  }
  if (attendance.members.length === 0) {
    return <p className={navStyles.state}>{t("attendance.noMembers")}</p>;
  }

  const hasFuture = narrow
    ? session !== undefined && isFutureDate(session.date, today)
    : attendance.sessions.some((item) => isFutureDate(item.date, today));

  return (
    <>
      {narrow && session ? (
        <SessionChecklist
          groupId={groupId}
          month={month}
          session={session}
          members={attendance.members}
          today={today}
        />
      ) : (
        <AttendanceGrid groupId={groupId} month={month} data={attendance} today={today} />
      )}
      {hasFuture ? <p className={navStyles.hint}>{t("attendance.futureHint")}</p> : null}
    </>
  );
};
