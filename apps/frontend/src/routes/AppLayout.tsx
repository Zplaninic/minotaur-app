import { toErrorCode } from "@repo/shared/client";
import { Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAbility, useLogout, useMe } from "../api/auth";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { errorMessage, t } from "../lib/messages";
import styles from "./AppLayout.module.css";

// Every page except login: only for logged-in members.
export const AppLayout = () => {
  const me = useMe();
  const ability = useAbility();
  const logout = useLogout();
  const location = useLocation();

  if (me.isPending) {
    return (
      <main className={styles.main}>
        <output>{t("auth.checking")}</output>
      </main>
    );
  }
  if (me.isError) {
    return (
      <main className={styles.main}>
        <p role="alert">{errorMessage(toErrorCode(me.error))}</p>
        <div>
          <Button variant="secondary" onClick={() => void me.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </main>
    );
  }
  if (!me.data) {
    // While the router moves to /login this layout can still render once with
    // the new address; redirecting again would nest redirect= endlessly.
    return location.pathname === "/login" ? null : <Navigate to="/login" search={{ redirect: location.href }} replace />;
  }

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label={t("nav.label")}>
          <Link to="/" className={styles.brand}>
            <Logo variant="app" alt={t("app.name")} compact />
          </Link>
          {ability.can("read", "Member") ? (
            <Link to="/members" className={styles.link} activeProps={{ "aria-current": "page" }}>
              {t("nav.members")}
            </Link>
          ) : null}
          {ability.can("read", "Group") ? (
            <Link to="/groups" className={styles.link} activeProps={{ "aria-current": "page" }}>
              {t("nav.groups")}
            </Link>
          ) : null}
          <div className={styles.account}>
            <span className={styles.name}>{t("nav.loggedInAs", { name: `${me.data.name} ${me.data.surname}` })}</span>
            <button
              type="button"
              className={styles.logout}
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {t("nav.logout")}
            </button>
          </div>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
};
