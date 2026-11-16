import { useMessages } from "../lib/messages";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";
import { Dialog } from "./Dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  // While the action runs, the confirm button is disabled and shows this.
  pendingLabel?: string;
  pending?: boolean;
  // Shown inside the dialog, so the person can try again or cancel.
  error?: string | undefined;
};

// Asks before an action that removes something.
export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  pendingLabel,
  pending = false,
  error,
}: ConfirmDialogProps) => {
  const { t } = useMessages();
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <p>{message}</p>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          {pending && pendingLabel ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
};
