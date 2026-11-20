import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import styles from "./TopProgress.module.css";

// A thin bar along the top of the window while any request runs, including
// background refetches and saves that have no loader of their own.
export const TopProgress = () => {
  const busy = useIsFetching() + useIsMutating() > 0;
  return busy ? <div className={styles.bar} aria-hidden="true" /> : null;
};
