import styles from "./Spinner.module.css";

type SpinnerProps = {
  // "sm" follows the text size, for buttons; "md" stands on its own.
  size?: "sm" | "md";
};

// Decorative: the surrounding element carries the accessible loading text.
export const Spinner = ({ size = "md" }: SpinnerProps) => (
  <span className={[styles.spinner, styles[size]].join(" ")} aria-hidden="true" />
);
