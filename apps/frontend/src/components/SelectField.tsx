import { useId } from "react";
import styles from "./Field.module.css";
import { FieldLabel } from "./FieldLabel";
import { FieldMessage } from "./FieldMessage";

type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  placeholder: string;
  error?: string | undefined;
  required?: boolean;
};

export const SelectField = ({ label, value, onChange, options, placeholder, error, required = false }: SelectFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <FieldLabel htmlFor={id} label={label} optional={!required} />
      <select
        id={id}
        className={styles.control}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage id={errorId} error={error} />
    </div>
  );
};
