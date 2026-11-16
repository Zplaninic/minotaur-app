import type { Month } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useMutationState } from "@tanstack/react-query";
import { attendanceMutationKey } from "../../api/attendance";
import { errorMessage } from "../../lib/messages";
import styles from "./Attendance.module.css";

type AttendanceErrorProps = {
  groupId: string;
  month: Month;
};

// The error of the latest tick in this group's month, if it failed. The box
// itself is already back to what the server has.
export const AttendanceError = ({ groupId, month }: AttendanceErrorProps) => {
  const latest = useMutationState({
    filters: { mutationKey: attendanceMutationKey(groupId, month) },
    select: (mutation) => mutation.state,
  })
    .toSorted((a, b) => a.submittedAt - b.submittedAt)
    .at(-1);

  if (latest?.status !== "error") {
    return null;
  }
  return (
    <p role="alert" className={styles.error}>
      {errorMessage(toErrorCode(latest.error))}
    </p>
  );
};
