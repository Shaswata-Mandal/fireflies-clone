// localStorage throws in some environments (Safari private mode, blocked cookies, quota exceeded) and
// doesn't exist on the server. Preferences are nice-to-have, so failures fall back silently.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not persisted; the in-memory state still works for this session.
  }
}
