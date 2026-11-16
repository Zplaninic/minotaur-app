import { toErrorCode } from "@repo/shared/client";
import { useMutationState } from "@tanstack/react-query";
import { ATTENDANCE_MUTATION } from "../../api/attendance";
import { errorMessage } from "../../lib/messages";
import styles from "./Attendance.module.css";

// The error of the latest tick, if it failed. The box itself is already back
// to what the server has.
export const AttendanceError = () => {
  const latest = useMutationState({
    filters: { mutationKey: ATTENDANCE_MUTATION },
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
