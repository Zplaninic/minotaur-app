import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  // While the action runs: disabled, with a spinner before the label.
  pending?: boolean;
};

export const Button = ({
  variant = "primary",
  type = "button",
  className,
  pending = false,
  disabled,
  children,
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={[styles.button, styles[variant], className].filter(Boolean).join(" ")}
    disabled={disabled || pending}
    aria-busy={pending || undefined}
    {...props}
  >
    {pending ? <Spinner size="sm" /> : null}
    {children}
  </button>
);
