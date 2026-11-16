import { toIsoDate } from "@repo/shared/client";
import { useSyncExternalStore } from "react";

const CHECK_EVERY_MS = 60_000;

// The day is checked again when the tab comes back and once a minute, so a
// page left open overnight moves on to the new day.
const subscribe = (onChange: () => void): (() => void) => {
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("focus", onChange);
  const timer = window.setInterval(onChange, CHECK_EVERY_MS);
  return () => {
    document.removeEventListener("visibilitychange", onChange);
    window.removeEventListener("focus", onChange);
    window.clearInterval(timer);
  };
};

// Today's local calendar day, as YYYY-MM-DD.
export const useToday = (): string => useSyncExternalStore(subscribe, () => toIsoDate(new Date()));
