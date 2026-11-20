import type { Month } from "@repo/shared";
import { monthRosterCandidates, toErrorCode } from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useAddMonthMember, useGroupAttendance } from "../../api/attendance";
import { useGroupMembers } from "../../api/groups";
import { useAllMembers } from "../../api/members";
import { Button } from "../../components/Button";
import { SelectField } from "../../components/SelectField";
import { formatSortedName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "../groups/GroupForm.module.css";

type AddMonthMemberFormProps = {
  groupId: string;
  month: Month;
  onCancel: () => void;
  onSaved: () => void;
};

// Picks a member who is not on the month's roster yet: the group's members
// first, then everyone else, who can also join the group.
export const AddMonthMemberForm = ({ groupId, month, onCancel, onSaved }: AddMonthMemberFormProps) => {
  const { errorMessage, t } = useMessages();
  const everyone = useAllMembers();
  const groupMembers = useGroupMembers(groupId);
  const attendance = useGroupAttendance(groupId, month);
  const addMember = useAddMonthMember(groupId, month);
  const [memberId, setMemberId] = useState("");
  const [joinGroup, setJoinGroup] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (everyone.isPending || groupMembers.isPending || attendance.isPending) {
    return <output>{t("monthMemberForm.membersLoading")}</output>;
  }
  if (everyone.isError || groupMembers.isError || attendance.isError) {
    return (
      <div className={styles.form}>
        <p role="alert">{errorMessage(toErrorCode(everyone.error ?? groupMembers.error ?? attendance.error))}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void Promise.all([everyone.refetch(), groupMembers.refetch(), attendance.refetch()])}
          >
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const candidates = monthRosterCandidates(everyone.data, groupMembers.data.items, attendance.data.members);
  if (candidates.length === 0) {
    return <p>{t("monthMemberForm.membersEmpty")}</p>;
  }
  const picked = candidates.find((candidate) => candidate.member.id === memberId);
  const canJoinGroup = picked !== undefined && !picked.inGroup;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (picked) {
      addMember.mutate({ memberId: picked.member.id, joinGroup: canJoinGroup && joinGroup }, { onSuccess: onSaved });
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <SelectField
        label={t("monthMemberForm.member")}
        placeholder={t("monthMemberForm.memberPlaceholder")}
        value={memberId}
        onChange={setMemberId}
        options={candidates.map(({ member, inGroup }) => ({
          value: member.id,
          label: formatSortedName(member),
          group: t(inGroup ? "monthMemberForm.groupMembers" : "monthMemberForm.otherMembers"),
        }))}
        error={submitted && memberId === "" ? t("monthMemberForm.error.member") : undefined}
        required
      />

      {canJoinGroup ? (
        <label className={styles.toggle}>
          <input type="checkbox" checked={joinGroup} onChange={(event) => setJoinGroup(event.target.checked)} />
          {t("monthMemberForm.joinGroup")}
        </label>
      ) : null}

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
