import type { Month } from "@repo/shared";
import { monthRosterCandidates, toErrorCode } from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useAddMonthMember, useGroupAttendance } from "../../api/attendance";
import { useGroupMembers } from "../../api/groups";
import { Button } from "../../components/Button";
import { SelectField } from "../../components/SelectField";
import { formatSortedName } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import styles from "../groups/GroupForm.module.css";

type AddMonthMemberFormProps = {
  groupId: string;
  month: Month;
  onCancel: () => void;
  onSaved: () => void;
};

// Picks one of the group's members who is not on the month's roster yet.
export const AddMonthMemberForm = ({ groupId, month, onCancel, onSaved }: AddMonthMemberFormProps) => {
  const groupMembers = useGroupMembers(groupId);
  const attendance = useGroupAttendance(groupId, month);
  const addMember = useAddMonthMember(groupId, month);
  const [memberId, setMemberId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (memberId !== "") {
      addMember.mutate(memberId, { onSuccess: onSaved });
    }
  };

  if (groupMembers.isPending || attendance.isPending) {
    return <output>{t("monthMemberForm.membersLoading")}</output>;
  }
  if (groupMembers.isError || attendance.isError) {
    return (
      <div className={styles.form}>
        <p role="alert">{errorMessage(toErrorCode(groupMembers.error ?? attendance.error))}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void Promise.all([groupMembers.refetch(), attendance.refetch()])}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const candidates = monthRosterCandidates(groupMembers.data.items, attendance.data.members);
  if (candidates.length === 0) {
    return <p>{t("monthMemberForm.membersEmpty")}</p>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <SelectField
        label={t("monthMemberForm.member")}
        placeholder={t("monthMemberForm.memberPlaceholder")}
        value={memberId}
        onChange={setMemberId}
        options={candidates.map((member) => ({ value: member.id, label: formatSortedName(member) }))}
        error={submitted && memberId === "" ? t("monthMemberForm.error.member") : undefined}
        required
      />

      {addMember.error ? (
        <p role="alert" className={styles.formError}>
          {errorMessage(toErrorCode(addMember.error))}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={addMember.isPending}>
          {addMember.isPending ? t("monthMemberForm.submitting") : t("monthMemberForm.submit")}
        </Button>
      </div>
    </form>
  );
};
