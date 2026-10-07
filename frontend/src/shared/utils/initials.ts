/**
 * Avatar initials helper.
 *
 * WHAT: Builds the one or two letters shown inside an avatar.
 * LAYER: Shared util.
 * CALLED BY: `UserAvatar` and other avatar displays.
 * CALLS: nothing.
 * MERN EQUIVALENT: a `getInitials(name)` helper.
 */

const FALLBACK_INITIAL = "?";

/** "Priya Shah" → "PS", "experimentation2025" → "E", "" → "?". */
// @param name a person's name, possibly missing; @returns up to two uppercase letters
export function getInitials(name: string | null | undefined): string {
  // `?? ""` handles null/undefined; `filter(Boolean)` drops empty strings left by the split.
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return FALLBACK_INITIAL;
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}
