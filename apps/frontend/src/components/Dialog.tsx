import { useEffect, useId, useRef, type ReactNode } from "react";
import { useMessages } from "../lib/messages";
import styles from "./Dialog.module.css";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

// Native modal dialog: focus trap, Escape to close and the backdrop come from the browser.
export const Dialog = ({ open, onClose, title, children }: DialogProps) => {
  const { t } = useMessages();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open ? (
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 id={titleId}>{title}</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label={t("common.close")}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
};
