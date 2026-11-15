import { useId, type InputHTMLAttributes } from "react";
import styles from "./Field.module.css";
import { FieldLabel } from "./FieldLabel";
import { FieldMessage } from "./FieldMessage";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  optional?: boolean;
};

export const TextField = ({ label, value, onChange, error, optional = false, ...inputProps }: TextFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <FieldLabel htmlFor={id} label={label} optional={optional} />
      <input
        id={id}
        className={styles.control}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      <FieldMessage id={errorId} error={error} />
    </div>
  );
};
