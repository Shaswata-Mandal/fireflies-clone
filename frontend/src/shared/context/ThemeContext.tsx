"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DARK_CLASS,
  DEFAULT_THEME,
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/shared/utils/theme";
import { readStorage, writeStorage } from "@/shared/utils/safe-storage";

interface ThemeContextValue {
  /** What the user picked (may be "system"). */
  theme: ThemePreference;
  /** What is actually applied to <html>. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

function systemPrefersDark(): boolean {
  return window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Server and first client render both use the default, matching the `dark` class in layout.tsx.
  const [theme, setThemeState] = useState<ThemePreference>(DEFAULT_THEME);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // Storage only exists in the browser, so the saved choice is applied after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from an external store
    setThemeState(parseThemePreference(readStorage(THEME_STORAGE_KEY)));
  }, []);

  // Keeps <html> in step with the preference; for "system" it also follows live OS changes.
  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    function apply() {
      const resolved = resolveTheme(theme, systemPrefersDark());
      document.documentElement.classList.toggle(DARK_CLASS, resolved === "dark");
      setResolvedTheme(resolved);
    }
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    writeStorage(THEME_STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
