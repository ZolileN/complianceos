"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "praxis-theme";
const CHANGE_EVENT = "praxis-theme-change";

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

const emptySubscribe = () => () => {};

export function useTheme() {
  // External store: theme lives in localStorage; no setState-in-effect needed.
  const theme = useSyncExternalStore(
    subscribeTheme,
    readStoredTheme,
    () => "light" as ThemeMode
  );
  // false during SSR/hydration, true on the client.
  const ready = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const setTheme = useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readStoredTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggleTheme, ready };
}
