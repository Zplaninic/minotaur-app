import type { EnrollmentRequestState } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { useEnrollmentRequests } from "../../api/enrollmentRequests";
import { useGroups } from "../../api/groups";
import { Button } from "../../components/Button";
import { LoadingState } from "../../components/LoadingState";
import { enrollmentEmptyKey, useMessages } from "../../lib/messages";
import { EnrollmentRequestCard } from "./EnrollmentRequestCard";
import styles from "./EnrollmentRequestList.module.css";

const PAGE_SIZE = 20;

type EnrollmentRequestListProps = {
  state: EnrollmentRequestState;
};

export const EnrollmentRequestList = ({ state }: EnrollmentRequestListProps) => {
  const { errorMessage, t } = useMessages();
  const [page, setPage] = useState(1);
  const requests = useEnrollmentRequests({ state, page, pageSize: PAGE_SIZE });
  const groups = useGroups();
  // After the last request of the last page is handled, that page is empty;
  // move back to the last page that still has requests.
  // Adjusted while rendering, as React recommends for state that follows other data.
  const lastPage = requests.data ? Math.max(1, Math.ceil(requests.data.total / PAGE_SIZE)) : undefined;
  if (lastPage !== undefined && page > lastPage) {
    setPage(lastPage);
  }

  if (requests.isPending || groups.isPending || (lastPage !== undefined && page > lastPage)) {
    return <LoadingState label={t("enrollments.loading")} variant="card" />;
  }
  const failed = requests.error ?? groups.error;
  if (requests.isError || groups.isError) {
    return (
      <div className={styles.state} role="alert">
        <p>{errorMessage(toErrorCode(failed))}</p>
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              void requests.refetch();
              void groups.refetch();
            }}
          >
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }
  const { items, total, waitingByGroup } = requests.data;
  if (items.length === 0) {
    return <p className={styles.state}>{t(enrollmentEmptyKey(state))}</p>;
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  return (
    <div className={styles.list}>
      {items.map((request) => (
        <EnrollmentRequestCard
          key={request.id}
          request={request}
          groups={groups.data.items}
          waitingByGroup={waitingByGroup}
        />
      ))}
      {pages > 1 ? (
        <nav className={styles.pager} aria-label={t("enrollments.pages")}>
          <Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page <= 1}>
            {t("enrollments.previous")}
          </Button>
          <span>{t("enrollments.page", { page, pages })}</span>
          <Button variant="secondary" onClick={() => setPage(page + 1)} disabled={page >= pages}>
            {t("enrollments.next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
};
