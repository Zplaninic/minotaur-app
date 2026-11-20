import { Spinner } from "./Spinner";
import styles from "./LoadingState.module.css";

type LoadingStateProps = {
  label: string;
  // "card" stands alone on a page; "inline" sits inside a card, dialog or section.
  variant?: "card" | "inline" | "page";
};

export const LoadingState = ({ label, variant = "inline" }: LoadingStateProps) => (
  <output className={[styles.state, styles[variant]].join(" ")}>
    <Spinner />
    <span>{label}</span>
  </output>
);
