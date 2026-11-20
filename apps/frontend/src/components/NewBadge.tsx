import { useMessages } from "../lib/messages";
import styles from "./NewBadge.module.css";

// Marks a member who is new to the club.
export const NewBadge = () => {
  const { t } = useMessages();
  return <span className={styles.badge}>{t("member.newBadge")}</span>;
};
