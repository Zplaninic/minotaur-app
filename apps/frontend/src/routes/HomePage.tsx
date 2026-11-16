import { Logo } from "../components/Logo";
import { useMessages } from "../lib/messages";
import styles from "./HomePage.module.css";

export const HomePage = () => {
  const { t } = useMessages();
  return (
    <h1 className={styles.hero}>
      <Logo variant="app" alt={t("app.name")} />
    </h1>
  );
};
