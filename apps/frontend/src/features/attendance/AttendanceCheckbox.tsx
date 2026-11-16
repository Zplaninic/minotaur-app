import type { Month } from "@repo/shared";
import type { ReactNode } from "react";
import { useSetAttendance } from "../../api/attendance";
import styles from "./AttendanceCheckbox.module.css";

type AttendanceCheckboxProps = {
  groupId: string;
  month: Month;
  sessionId: string;
  memberId: string;
  checked: boolean;
  disabled: boolean;
  // Read by screen readers. Set children to show text next to the box instead.
  label: string;
  children?: ReactNode;
  layout: "cell" | "row";
};

export const AttendanceCheckbox = ({
  groupId,
  month,
  sessionId,
  memberId,
  checked,
  disabled,
  label,
  children,
  layout,
}: AttendanceCheckboxProps) => {
  const setAttendance = useSetAttendance(groupId, month);
  return (
    <label className={styles[layout]}>
      <input
        type="checkbox"
        className={styles.box}
        checked={checked}
        disabled={disabled || setAttendance.isPending}
        aria-label={children ? undefined : label}
        onChange={(event) => setAttendance.mutate({ sessionId, memberId, attended: event.target.checked })}
      />
      {children}
    </label>
  );
};
