import { useSyncExternalStore } from "react";

// --breakpoint-narrow from tokens.css, as a media query. Undefined where
// matchMedia or the token is missing (tests), which means "not narrow".
const narrowQuery = (): MediaQueryList | undefined => {
  if (typeof window.matchMedia !== "function") {
    return undefined;
  }
  const breakpoint = getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-narrow").trim();
  return breakpoint === "" ? undefined : window.matchMedia(`(width < ${breakpoint})`);
};

const subscribe = (onChange: () => void): (() => void) => {
  const query = narrowQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
};

// True on screens narrower than --breakpoint-narrow, e.g. phones.
export const useNarrowScreen = (): boolean =>
  useSyncExternalStore(subscribe, () => narrowQuery()?.matches ?? false);
