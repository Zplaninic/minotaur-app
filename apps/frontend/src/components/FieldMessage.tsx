import styles from "./Field.module.css";

type FieldMessageProps = {
  id: string;
  error: string | undefined;
};

export const FieldMessage = ({ id, error }: FieldMessageProps) =>
  error ? (
    <p id={id} className={styles.error}>
      {error}
    </p>
  ) : null;
