import type { AuditEventResponse } from "@repo/shared";
import { toErrorCode, type AuditEventFilters } from "@repo/shared/client";
import { useAuditEvents } from "../../api/auditEvents";
import { Button } from "../../components/Button";
import { formatDateTime, formatMonth, formatPersonName, formatSessionDate, formatTimeOfDay } from "../../lib/format";
import { auditActionKey, type Translate, useMessages, weekdayKey } from "../../lib/messages";
import { describeChanges } from "./describeChanges";
import styles from "./ActivityTable.module.css";

// What the event is about: the member, group, subscription and when, one per line.
const targetLines = (event: AuditEventResponse, t: Translate): string[] => [
  ...(event.member ? [formatPersonName(event.member)] : []),
  ...(event.group
    ? [
        t("groups.name", {
          trainer: formatPersonName(event.group.owner),
          days: event.group.days.map((day) => t(weekdayKey(day))).join(", "),
          from: formatTimeOfDay(event.group.from),
          to: formatTimeOfDay(event.group.to),
        }),
      ]
    : []),
  ...(event.subscription ? [event.subscription.name] : []),
  ...(event.date
    ? [t("activity.target.session", { date: formatSessionDate(event.date) })]
    : event.month
      ? [formatMonth(event.month)]
      : []),
];

const Lines = ({ lines }: { lines: string[] }) =>
  lines.length === 0 ? null : (
    <ul className={styles.lines}>
      {lines.map((line, index) => (
        // The same text can appear twice, e.g. a member named like their trainer.
        <li key={index}>{line}</li>
      ))}
    </ul>
  );

type ActivityTableProps = {
  filters: AuditEventFilters;
  filtered: boolean;
};

export const ActivityTable = ({ filters, filtered }: ActivityTableProps) => {
  const { errorMessage, t } = useMessages();
  const events = useAuditEvents(filters);

  // A failed "load more" keeps the pages already shown; only a failed first page replaces them.
  if (!events.data) {
    if (!events.isError) {
      return <output>{t("activity.loading")}</output>;
    }
    return (
      <div className={styles.state} role="alert">
        <p>{errorMessage(toErrorCode(events.error))}</p>
        <div>
          <Button variant="secondary" onClick={() => void events.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const items = events.data.pages.flatMap((page) => page.items);
  if (items.length === 0) {
    return <p className={styles.state}>{filtered ? t("activity.emptyFiltered") : t("activity.empty")}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>{t("activity.table.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("activity.table.when")}</th>
              <th scope="col">{t("activity.table.who")}</th>
              <th scope="col">{t("activity.table.action")}</th>
              <th scope="col">{t("activity.table.target")}</th>
              <th scope="col">{t("activity.table.details")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((event) => (
              <tr key={event.id}>
                <td className={styles.nowrap}>
                  <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
                </td>
                <td>{event.actor ? formatPersonName(event.actor) : t("activity.system")}</td>
                <th scope="row">{t(auditActionKey(event.action))}</th>
                <td>
                  <Lines lines={targetLines(event, t)} />
                </td>
                <td>
                  <Lines lines={describeChanges(event.changes, t)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {events.hasNextPage ? (
        <div>
          <Button variant="secondary" onClick={() => void events.fetchNextPage()} disabled={events.isFetchingNextPage}>
            {events.isFetchingNextPage ? t("activity.loadingMore") : t("activity.loadMore")}
          </Button>
        </div>
      ) : null}
      {events.isFetchNextPageError ? <p role="alert">{errorMessage(toErrorCode(events.error))}</p> : null}
    </div>
  );
};
