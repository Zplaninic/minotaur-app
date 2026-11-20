import { useId } from "react";
import styles from "./Field.module.css";
import { FieldLabel } from "./FieldLabel";
import { FieldMessage } from "./FieldMessage";

// Consecutive options with the same group go into one <optgroup>.
type Option = { value: string; label: string; group?: string };

const toRuns = (options: readonly Option[]): { group: string | undefined; options: Option[] }[] =>
  options.reduce<{ group: string | undefined; options: Option[] }[]>((runs, option) => {
    const last = runs.at(-1);
    if (last && last.group === option.group) {
      last.options.push(option);
    } else {
      runs.push({ group: option.group, options: [option] });
    }
    return runs;
  }, []);

const renderOption = (option: Option) => (
  <option key={option.value} value={option.value}>
    {option.label}
  </option>
);

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
        {toRuns(options).map((run) =>
          run.group === undefined ? (
            run.options.map(renderOption)
          ) : (
            <optgroup key={run.group} label={run.group}>
              {run.options.map(renderOption)}
            </optgroup>
          ),
        )}
      </select>
      <FieldMessage id={errorId} error={error} />
    </div>
  );
};
