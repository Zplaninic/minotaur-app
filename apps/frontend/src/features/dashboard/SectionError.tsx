import { toErrorCode } from "@repo/shared/client";
import { Button } from "../../components/Button";
import { useMessages } from "../../lib/messages";
import styles from "./Dashboard.module.css";

type SectionErrorProps = {
  error: unknown;
  onRetry: () => void;
};

export const SectionError = ({ error, onRetry }: SectionErrorProps) => {
  const { errorMessage, t } = useMessages();
  return (
    <div className={styles.state} role="alert">
      <p>{errorMessage(toErrorCode(error))}</p>
      <div>
        <Button variant="secondary" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </div>
    </div>
  );
};
