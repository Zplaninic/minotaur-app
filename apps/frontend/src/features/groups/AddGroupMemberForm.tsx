import { groupMemberCandidates, toErrorCode } from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useAddGroupMember, useGroupMembers } from "../../api/groups";
import { useAllMembers } from "../../api/members";
import { Button } from "../../components/Button";
import { SelectField } from "../../components/SelectField";
import { formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./GroupForm.module.css";
import { LoadingState } from "../../components/LoadingState";

type AddGroupMemberFormProps = {
  groupId: string;
  onCancel: () => void;
  onSaved: () => void;
};

export const AddGroupMemberForm = ({ groupId, onCancel, onSaved }: AddGroupMemberFormProps) => {
  const { errorMessage, t } = useMessages();
  const everyone = useAllMembers();
  const current = useGroupMembers(groupId);
  const addMember = useAddGroupMember(groupId);
  const [memberId, setMemberId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (memberId !== "") {
      addMember.mutate(memberId, { onSuccess: onSaved });
    }
  };

  if (everyone.isPending || current.isPending) {
    return <LoadingState label={t("groupMemberForm.membersLoading")} />;
  }
  const loadError = everyone.error ?? current.error;
  if (everyone.isError || current.isError) {
    return (
      <div className={styles.form}>
        <p role="alert">{errorMessage(toErrorCode(loadError))}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void Promise.all([everyone.refetch(), current.refetch()])}>{t("common.retry")}</Button>
        </div>
      </div>
    );
  }

  const candidates = groupMemberCandidates(everyone.data, current.data.items);
  if (candidates.length === 0) {
    return <p>{t("groupMemberForm.membersEmpty")}</p>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <SelectField
        label={t("groupMemberForm.member")}
        placeholder={t("groupMemberForm.memberPlaceholder")}
        value={memberId}
        onChange={setMemberId}
        options={candidates.map((member) => ({ value: member.id, label: formatPersonName(member) }))}
        error={submitted && memberId === "" ? t("groupMemberForm.error.member") : undefined}
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
        <Button type="submit" pending={addMember.isPending}>
          {addMember.isPending ? t("groupMemberForm.submitting") : t("groupMemberForm.submit")}
        </Button>
      </div>
    </form>
  );
};
