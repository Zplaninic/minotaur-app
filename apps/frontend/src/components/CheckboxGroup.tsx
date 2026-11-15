import { useId } from "react";
import styles from "./CheckboxGroup.module.css";
import { FieldMessage } from "./FieldMessage";

type Option<Value extends string> = { value: Value; label: string };

type CheckboxGroupProps<Value extends string> = {
  legend: string;
  options: readonly Option<Value>[];
  selected: readonly Value[];
  onToggle: (value: Value) => void;
  error?: string | undefined;
};

export const CheckboxGroup = <Value extends string>({
  legend,
  options,
  selected,
  onToggle,
  error,
}: CheckboxGroupProps<Value>) => {
  const errorId = `${useId()}-error`;
  return (
    <fieldset className={styles.group} aria-describedby={error ? errorId : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              aria-invalid={error ? true : undefined}
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldMessage id={errorId} error={error} />
    </fieldset>
  );
};
