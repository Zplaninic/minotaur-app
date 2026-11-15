import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useMe } from "../api/auth";
import { Logo } from "../components/Logo";
import { LoginForm }from "../features/auth/LoginForm";
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
        <div className={styles.brand}>
          <Logo variant="club" alt={t("app.clubName")} />
        </div>
        <h1 className={styles.title}>{t("login.title")}</h1>
        <LoginForm onLoggedIn={() => void navigate({ to: target, replace: true })} />
      </div>
    </main>
  );
};
