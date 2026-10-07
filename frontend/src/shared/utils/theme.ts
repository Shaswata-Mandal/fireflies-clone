// Pure theme rules, so the provider stays thin and the logic is testable without a DOM.

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME: ThemePreference = "dark";
export const THEME_STORAGE_KEY = "ui.theme";
export const DARK_CLASS = "dark";
export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

/** Stored value → a valid preference; anything unknown (or missing) falls back to the default. */
export function parseThemePreference(value: string | null): ThemePreference {
  return THEME_PREFERENCES.find((preference) => preference === value) ?? DEFAULT_THEME;
}

/** "system" follows the OS; the other two are explicit. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}
