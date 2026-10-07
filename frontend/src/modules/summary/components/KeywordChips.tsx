/**
 * Keyword chips.
 *
 * WHAT: Renders each summary keyword as a small tinted pill.
 * LAYER: Module component (server-safe).
 * CALLED BY: `SummaryView`.
 */

interface KeywordChipsProps {
  keywords: ReadonlyArray<string>;
}

/** Key topics as tinted chips (same tint as the active filter chip in 10). */
export function KeywordChips({ keywords }: KeywordChipsProps) {
  return (
    <ul className="flex flex-wrap gap-2">
      {keywords.map((keyword, index) => (
        <li
          // Keywords may repeat after a manual edit, so the index keeps keys unique.
          key={`${index}-${keyword}`}
          className="rounded-md bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary-fg"
        >
          {keyword}
        </li>
      ))}
    </ul>
  );
}
