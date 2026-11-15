import { t } from "../lib/messages";
import styles from "./Field.module.css";

type FieldLabelProps = {
  htmlFor: string;
  label: string;
  optional: boolean;
};

export const FieldLabel = ({ htmlFor, label, optional }: FieldLabelProps) => (
  <label htmlFor={htmlFor} className={styles.label}>
    {label}
    {optional ? <span className={styles.optional}> ({t("common.optional")})</span> : null}
  </label>
);
