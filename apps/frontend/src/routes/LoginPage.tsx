import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useMe } from "../api/auth";
import { LoginForm } from "../features/auth/LoginForm";
import { t } from "../lib/messages";
import { safeRedirect } from "../lib/redirect";
import styles from "./LoginPage.module.css";

export const LoginPage = () => {
  const me = useMe();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const target = safeRedirect(redirect);

  if (me.data) {
    return <Navigate to={target} replace />;
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}>{t("app.name")}</p>
        <h1 className={styles.title}>{t("login.title")}</h1>
        <LoginForm onLoggedIn={() => void navigate({ to: target, replace: true })} />
      </div>
    </main>
  );
};
