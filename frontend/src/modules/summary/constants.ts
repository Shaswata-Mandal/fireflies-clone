/**
 * Summary module constants and UI copy.
 *
 * WHAT: Field limits (mirroring the backend), form separators, badge labels and all fixed text.
 * LAYER: Module constants.
 * CALLED BY: schema.ts, hooks.ts and the summary components.
 * CALLS: types only.
 */

import type { GeneratedBy } from "@/modules/meetings/types";

// Same limits as backend/app/modules/summaries/schemas.py (SUMMARY_*_MAX_*).
export const SUMMARY_OVERVIEW_MAX_LENGTH = 5000;
export const SUMMARY_BULLET_MAX_LENGTH = 500;
export const SUMMARY_KEYWORD_MAX_LENGTH = 50;
export const SUMMARY_MAX_KEYWORDS = 20;

/** Separators used by the edit form: one bullet per line, keywords comma-separated. */
export const BULLET_SEPARATOR = "\n";
export const KEYWORD_SEPARATOR = ",";

/** Small source label next to the summary. Mock and LLM output are both machine-written. */
export const GENERATED_BY_LABEL: Record<GeneratedBy, string> = {
  seed: "Seed",
  mock: "AI generated",
  llm: "AI generated",
};

export const SUMMARY_COPY = {
  // Empty-state copy is verbatim from screenshots 17 / 17.1.
  EMPTY_TITLE: "No meeting summary yet",
  EMPTY_BODY: "Generate a summary, outline and action items from the transcript.",
  NO_TRANSCRIPT_TITLE: "No meeting summary available",
  NO_TRANSCRIPT_BODY: "Meeting does not have the transcript to generate a summary.",
  GENERATE: "Generate summary",
  REGENERATE: "Regenerate",
  GENERATING: "Generating…",
  GENERATED: "Summary generated",
  UPDATED: "Summary updated",
  OVERVIEW_HEADING: "Overview",
  KEYWORDS_HEADING: "Keywords",
  BULLETS_HEADING: "Notes",
  OUTLINE_EMPTY_TITLE: "No outline yet",
  OUTLINE_EMPTY_BODY: "Chapters appear here once a summary has been generated.",
} as const;
