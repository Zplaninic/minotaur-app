import type { AttendanceMemberResponse } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useSetMemberNew } from "../../api/members";
import { formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./NewMemberToggle.module.css";

type NewMemberToggleProps = {
  member: AttendanceMemberResponse;
};

// Sets or removes the member's "New" badge, the same in all their groups.
export const NewMemberToggle = ({ member }: NewMemberToggleProps) => {
  const { errorMessage, t } = useMessages();
  const setNew = useSetMemberNew(member.id);
  // While saving, show the value being saved rather than jumping back.
  const isNew = setNew.isPending ? setNew.variables : member.isNew;
  const name = formatPersonName(member);

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={isNew}
        disabled={setNew.isPending}
        onClick={() => setNew.mutate(!isNew)}
        aria-label={t(isNew ? "attendance.removeNewLabel" : "attendance.markNewLabel", { name })}
      >
        {t(isNew ? "attendance.removeNew" : "attendance.markNew")}
      </button>
      {setNew.error ? (
        <p role="alert" className={styles.error}>
          {errorMessage(toErrorCode(setNew.error))}
        </p>
      ) : null}
    </>
  );
};
