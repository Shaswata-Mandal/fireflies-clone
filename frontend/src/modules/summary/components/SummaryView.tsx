/**
 * Read-only summary.
 *
 * WHAT: Overview paragraph, keyword chips and bullet notes (sections hidden when empty).
 * LAYER: Module component (server-safe).
 * CALLED BY: `SummaryPanel`.
 * CALLS: `SummarySection`, `KeywordChips`.
 */

import type { MeetingSummary } from "@/modules/meetings/types";
import { KeywordChips } from "@/modules/summary/components/KeywordChips";
import { SummarySection } from "@/modules/summary/components/SummarySection";
import { SUMMARY_COPY } from "@/modules/summary/constants";

interface SummaryViewProps {
  summary: MeetingSummary;
}

/**
 * Read mode: overview, keywords, then the bullet notes. No screenshot shows a filled summary
 * (colors.md §1.10), so the order follows the Fireflies Notes layout and the type scale of colors.md §4.
 */
export function SummaryView({ summary }: SummaryViewProps) {
  return (
    <div className="flex flex-col gap-8">
      <SummarySection title={SUMMARY_COPY.OVERVIEW_HEADING}>
        <p className="text-sm leading-6 whitespace-pre-line text-body">{summary.overview}</p>
      </SummarySection>

      {summary.keywords.length > 0 && (
        <SummarySection title={SUMMARY_COPY.KEYWORDS_HEADING}>
          <KeywordChips keywords={summary.keywords} />
        </SummarySection>
      )}

      {summary.bullet_points.length > 0 && (
        <SummarySection title={SUMMARY_COPY.BULLETS_HEADING}>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-body marker:text-muted">
            {summary.bullet_points.map((bullet, index) => (
              // Bullets can repeat and have no id; they're only re-ordered by a full replace.
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        </SummarySection>
      )}
    </div>
  );
}
