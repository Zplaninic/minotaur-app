import type { GuardianResponse } from "@repo/shared";
import { formatPersonName } from "../lib/format";
import { useMessages } from "../lib/messages";
import styles from "./GuardianList.module.css";

type GuardianListProps = {
  guardians: readonly GuardianResponse[];
};

// Each guardian's name, with their email below when they have one.
export const GuardianList = ({ guardians }: GuardianListProps) => {
  const { t } = useMessages();
  if (guardians.length === 0) {
    return <>{t("common.empty")}</>;
  }
  return (
    <ul className={styles.list}>
      {guardians.map((guardian) => (
        <li key={guardian.id}>
          {formatPersonName(guardian)}
          {guardian.email ? <span className={styles.email}>{guardian.email}</span> : null}
        </li>
      ))}
    </ul>
  );
};
