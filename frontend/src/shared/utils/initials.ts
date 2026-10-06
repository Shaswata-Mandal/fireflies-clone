const FALLBACK_INITIAL = "?";

/** "Priya Shah" → "PS", "experimentation2025" → "E", "" → "?". */
export function getInitials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return FALLBACK_INITIAL;
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}
