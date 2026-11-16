import { toIsoDate } from "@repo/shared/client";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

const CHECK_EVERY_MS = 60_000;

// The day is checked again when the app comes back and once a minute, so a
// screen left open overnight moves on to the new day.
const subscribe = (onChange: () => void): (() => void) => {
  const subscription = AppState.addEventListener("change", onChange);
  const timer = setInterval(onChange, CHECK_EVERY_MS);
  return () => {
    subscription.remove();
    clearInterval(timer);
  };
};

// Today's local calendar day, as YYYY-MM-DD. Tests pass a fixed moment.
export const useToday = (fixedNow?: Date): string =>
  useSyncExternalStore(subscribe, () => toIsoDate(fixedNow ?? new Date()));
