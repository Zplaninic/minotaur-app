import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const Button = ({ variant = "primary", type = "button", className, ...props }: ButtonProps) => (
  <button type={type} className={[styles.button, styles[variant], className].filter(Boolean).join(" ")} {...props} />
);
