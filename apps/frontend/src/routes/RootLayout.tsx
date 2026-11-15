import { Outlet } from "@tanstack/react-router";
import styles from "./RootLayout.module.css";

export const RootLayout = () => (
  <main className={styles.main}>
    <Outlet />
  </main>
);
