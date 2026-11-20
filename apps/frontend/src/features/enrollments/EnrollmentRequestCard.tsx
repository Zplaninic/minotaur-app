import type { EnrollmentRequestResponse, GroupResponse } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { useDeleteEnrollmentRequest } from "../../api/enrollmentRequests";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Dialog } from "../../components/Dialog";
import { formatDateTime } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { DraftEmail } from "./DraftEmail";
import { EnrollmentChildRow } from "./EnrollmentChildRow";
import styles from "./EnrollmentRequestCard.module.css";
import type { WaitingByGroup } from "./groupOptions";

type EnrollmentRequestCardProps = {
  request: EnrollmentRequestResponse;
  groups: readonly GroupResponse[];
  waitingByGroup: WaitingByGroup;
};

export const EnrollmentRequestCard = ({ request, groups, waitingByGroup }: EnrollmentRequestCardProps) => {
  const { errorMessage, t } = useMessages();
  const remove = useDeleteEnrollmentRequest(request.id);
  const [drafting, setDrafting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const parent = [request.parentName, request.parentSurname].filter(Boolean).join(" ");

  const closeDelete = () => {
    setDeleting(false);
    remove.reset();
  };

  return (
    <article className={styles.card} aria-label={parent}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.parent}>{parent}</h2>
          <p className={styles.received}>
            {t("enrollments.received", { date: formatDateTime(request.createdAt) })}
          </p>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => setDrafting(true)}>{t("enrollments.draftEmail")}</Button>
          <Button variant="secondary" onClick={() => setDeleting(true)}>
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <dl className={styles.contact}>
        <div>
          <dt>{t("enrollmentForm.parentPhone")}</dt>
          <dd>{request.parentPhone ?? t("common.empty")}</dd>
        </div>
        <div>
          <dt>{t("enrollmentForm.parentEmail")}</dt>
          <dd>{request.parentEmail ?? t("common.empty")}</dd>
        </div>
      </dl>

      <ul className={styles.children} aria-label={t("enrollmentForm.children")}>
        {request.children.map((child) => (
          <EnrollmentChildRow
            key={child.id}
            request={request}
            child={child}
            groups={groups}
            waitingByGroup={waitingByGroup}
          />
        ))}
      </ul>

      {request.rawText ? (
        <details className={styles.raw}>
          <summary>{t("enrollments.original")}</summary>
          <pre>{request.rawText}</pre>
        </details>
      ) : null}

      <Dialog open={drafting} onClose={() => setDrafting(false)} title={t("draftEmail.title")}>
        {drafting ? <DraftEmail request={request} groups={groups} onClose={() => setDrafting(false)} /> : null}
      </Dialog>
      <ConfirmDialog
        open={deleting}
        title={t("enrollments.deleteTitle", { name: parent })}
        message={t("enrollments.deleteText")}
        confirmLabel={t("common.delete")}
        pendingLabel={t("common.deleting")}
        pending={remove.isPending}
        error={remove.error ? errorMessage(toErrorCode(remove.error)) : undefined}
        onConfirm={() => remove.mutate(undefined, { onSuccess: closeDelete })}
        onCancel={closeDelete}
      />
    </article>
  );
};
