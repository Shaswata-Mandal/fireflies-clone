/**
 * Safe localStorage wrapper.
 *
 * WHAT: `readStorage` / `writeStorage` that never throw.
 * LAYER: Shared util (browser only; call from effects or event handlers, not during render).
 * CALLED BY: `ThemeContext` and `UIContext` (remembered preferences).
 * CALLS: `window.localStorage`.
 * MERN EQUIVALENT: `localStorage.getItem/setItem` wrapped in try/catch.
 */

// localStorage throws in some environments (Safari private mode, blocked cookies, quota exceeded) and
// doesn't exist on the server. Preferences are nice-to-have, so failures fall back silently.

/** @param key the storage key; @returns the saved string, or null when missing or unavailable. */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** @param key the storage key; @param value the string to save (failures are ignored). */
export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not persisted; the in-memory state still works for this session.
  }
}
