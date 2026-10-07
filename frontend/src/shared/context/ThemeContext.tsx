/**
 * Theme (light / dark / system) state, shared with the whole app.
 *
 * WHAT: A React Context holding the user's theme choice and the theme actually applied; it also
 *   toggles the `dark` class on <html> and remembers the choice in localStorage.
 * LAYER: Shared context (UI state, not server state).
 * CALLED BY: mounted in `Providers.tsx`; read with `useTheme()` by the Settings > Appearance tab.
 * CALLS: `utils/theme.ts` (pure rules) and `utils/safe-storage.ts`.
 * MERN EQUIVALENT: a ThemeContext + `useTheme` hook, or a Redux "ui" slice; same Context API.
 */

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

// The shape of what consumers receive from `useTheme()`.
interface ThemeContextValue {
  /** What the user picked (may be "system"). */
  theme: ThemePreference;
  /** What is actually applied to <html>. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

// `null` is the default so `useTheme` can detect "used outside <ThemeProvider>" and throw clearly.
const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

/** Asks the browser whether the OS is in dark mode (only call in the browser, not during SSR). */
function systemPrefersDark(): boolean {
  return window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

/**
 * Provides the theme to its children.
 * @param children the part of the tree that may call `useTheme()`
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Server and first client render both use the default, matching the `dark` class in layout.tsx.
  const [theme, setThemeState] = useState<ThemePreference>(DEFAULT_THEME);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // Storage only exists in the browser, so the saved choice is applied after mount.
  // useEffect with `[]` = run once after the first render (like componentDidMount).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from an external store
    setThemeState(parseThemePreference(readStorage(THEME_STORAGE_KEY)));
  }, []);

  // Keeps <html> in step with the preference; for "system" it also follows live OS changes.
  // The dependency array `[theme]` re-runs this effect whenever the choice changes, and the
  // returned function is the cleanup that removes the old OS listener first.
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

  // useCallback keeps the function's identity stable across renders, so memoised consumers and
  // the `useMemo` below don't see a "new" function every time.
  const setTheme = useCallback((next: ThemePreference) => {
    writeStorage(THEME_STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  // useMemo gives the context value a stable identity unless something in it really changed;
  // otherwise every consumer would re-render on every provider render.
  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the theme context.
 * @returns the current theme, the resolved theme, and `setTheme`
 * @throws if called outside `<ThemeProvider>` (a programming error, so fail loudly)
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
