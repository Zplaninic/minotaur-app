import type { EnrollmentChildResponse, EnrollmentRequestResponse, GroupResponse } from "@repo/shared";
import { useState } from "react";
import {
  useRejectEnrollmentChild,
  useReopenEnrollmentChild,
  useSetEnrollmentChildGroup,
} from "../../api/enrollmentRequests";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Dialog } from "../../components/Dialog";
import { SelectField } from "../../components/SelectField";
import { formatNumber } from "../../lib/format";
import { enrollmentStatusKey, useMessages } from "../../lib/messages";
import { groupName } from "../groups/groupName";
import { AcceptChildForm } from "./AcceptChildForm";
import { enrollmentActionError } from "./enrollmentActionError";
import styles from "./EnrollmentRequestCard.module.css";
import { groupOptions, type WaitingByGroup } from "./groupOptions";

type EnrollmentChildRowProps = {
  request: EnrollmentRequestResponse;
  child: EnrollmentChildResponse;
  groups: readonly GroupResponse[];
  waitingByGroup: WaitingByGroup;
};

export const EnrollmentChildRow = ({ request, child, groups, waitingByGroup }: EnrollmentChildRowProps) => {
  const { errorMessage, t } = useMessages();
  const setGroup = useSetEnrollmentChildGroup(request.id, child.id);
  const reject = useRejectEnrollmentChild(request.id, child.id);
  const reopen = useReopenEnrollmentChild(request.id, child.id);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const group = groups.find((candidate) => candidate.id === child.groupId);
  const pending = child.status === "pending";

  const closeReject = () => {
    setRejecting(false);
    reject.reset();
  };

  return (
    <li className={styles.child}>
      <div className={styles.childHeader}>
        <h3 className={styles.childName}>
          {t("enrollments.childAge", { name: child.name, age: formatNumber(child.age) })}
        </h3>
        <span className={`${styles.status} ${styles[child.status]}`}>{t(enrollmentStatusKey(child.status))}</span>
      </div>

      {pending ? (
        <>
          <SelectField
            label={t("enrollments.group", { name: child.name })}
            placeholder={t("enrollments.groupPlaceholder")}
            value={child.groupId ?? ""}
            onChange={(groupId) => setGroup.mutate(groupId === "" ? null : groupId)}
            options={groupOptions(groups, waitingByGroup, t)}
            error={setGroup.error ? enrollmentActionError(setGroup.error, t, errorMessage) : undefined}
          />
          <div className={styles.childActions}>
            <Button onClick={() => setAccepting(true)} disabled={setGroup.isPending}>
              {t("enrollments.accept")}
            </Button>
            <Button variant="secondary" onClick={() => setRejecting(true)}>
              {t("enrollments.reject")}
            </Button>
          </div>
        </>
      ) : child.status === "accepted" ? (
        <p>{group ? groupName(group, t) : t("enrollments.noGroup")}</p>
      ) : (
        <div className={styles.childActions}>
          <Button
            variant="secondary"
            onClick={() => reopen.mutate()}
            pending={reopen.isPending}
            aria-label={t("enrollments.reopenLabel", { name: child.name })}
          >
            {t("enrollments.reopen")}
          </Button>
          {reopen.error ? (
            <p role="alert" className={styles.rowError}>
              {enrollmentActionError(reopen.error, t, errorMessage)}
            </p>
          ) : null}
        </div>
      )}

      <Dialog open={accepting} onClose={() => setAccepting(false)} title={t("acceptForm.title", { name: child.name })}>
        {accepting ? (
          <AcceptChildForm
            request={request}
            child={child}
            groups={groups}
            waitingByGroup={waitingByGroup}
            onCancel={() => setAccepting(false)}
            onAccepted={() => setAccepting(false)}
          />
        ) : null}
      </Dialog>
      <ConfirmDialog
        open={rejecting}
        title={t("enrollments.rejectTitle", { name: child.name })}
        message={t("enrollments.rejectText")}
        confirmLabel={t("enrollments.reject")}
        pendingLabel={t("enrollments.rejecting")}
        pending={reject.isPending}
        error={reject.error ? enrollmentActionError(reject.error, t, errorMessage) : undefined}
        onConfirm={() => reject.mutate(undefined, { onSuccess: closeReject })}
        onCancel={closeReject}
      />
    </li>
  );
};
