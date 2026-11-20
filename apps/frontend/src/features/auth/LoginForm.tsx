import { loginBody } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useLogin } from "../../api/auth";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { type MessageKey, useMessages } from "../../lib/messages";
import styles from "./LoginForm.module.css";

type LoginFormProps = {
  onLoggedIn: () => void;
};

const fieldErrorKeys: Record<string, MessageKey> = {
  email: "login.error.email",
  password: "login.error.password",
};

export const LoginForm = ({ onLoggedIn }: LoginFormProps) => {
  const { errorMessage, t } = useMessages();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validation = loginBody.safeParse({ email, password });
  const fieldErrors: Partial<Record<string, string>> = {};
  if (submitted && !validation.success) {
    for (const issue of validation.error.issues) {
      const field = String(issue.path[0]);
      const key = fieldErrorKeys[field];
      if (key) {
        fieldErrors[field] ??= t(key);
      }
    }
  }

  const serverCode = login.error ? toErrorCode(login.error) : undefined;
  const formError =
    serverCode === "UNAUTHORIZED"
      ? t("login.error.credentials")
      : serverCode === "RATE_LIMITED"
        ? t("login.error.rateLimited")
        : serverCode
          ? errorMessage(serverCode)
          : undefined;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validation.success) {
      login.mutate({ email, password }, { onSuccess: onLoggedIn });
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <TextField
        label={t("login.email")}
        type="email"
        value={email}
        onChange={setEmail}
        error={fieldErrors["email"]}
        autoComplete="username"
        required
      />
      <TextField
        label={t("login.password")}
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={setPassword}
        error={fieldErrors["password"]}
        autoComplete="current-password"
        required
      />
      <label className={styles.toggle}>
        <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
        {t("login.showPassword")}
      </label>
      {formError ? (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      ) : null}
      <Button type="submit" pending={login.isPending}>
        {login.isPending ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  );
};
