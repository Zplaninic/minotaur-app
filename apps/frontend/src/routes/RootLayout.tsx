import { Link, Outlet } from "@tanstack/react-router";
import { t } from "../lib/messages";
import styles from "./RootLayout.module.css";

export const RootLayout = () => (
  <>
    <header className={styles.header}>
      <nav className={styles.nav} aria-label={t("nav.label")}>
        <Link to="/" className={styles.brand}>
          {t("app.name")}
        </Link>
        <Link to="/members" className={styles.link} activeProps={{ "aria-current": "page" }}>
          {t("nav.members")}
        </Link>
      </nav>
    </header>
    <main className={styles.main}>
      <Outlet />
    </main>
  </>
);
