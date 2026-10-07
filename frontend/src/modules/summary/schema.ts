/**
 * zod schema for the summary edit form.
 *
 * WHAT: Turns the form's plain text fields (a textarea of lines, a comma-separated input) into
 *   the arrays the API expects, and validates their limits.
 * LAYER: Module schema (client-side validation; the backend validates again).
 * CALLED BY: `SummaryEditForm` through react-hook-form's `zodResolver`.
 * CALLS: zod, `constants.ts`.
 * INTERVIEW: `.transform()` changes the value (string -> string[]) and `.refine()` then checks
 * the transformed value; the order matters, and the error message attaches to the field itself.
 */

import { z } from "zod";
import type { MeetingSummary } from "@/modules/meetings/types";
import {
  BULLET_SEPARATOR,
  KEYWORD_SEPARATOR,
  SUMMARY_BULLET_MAX_LENGTH,
  SUMMARY_KEYWORD_MAX_LENGTH,
  SUMMARY_MAX_KEYWORDS,
  SUMMARY_OVERVIEW_MAX_LENGTH,
} from "@/modules/summary/constants";

/** Splits free text into trimmed, non-empty entries ("a,, b " → ["a", "b"]). */
// @param value the raw field text; @param separator what separates entries; @returns clean entries
export function splitEntries(value: string, separator: string): string[] {
  return value
    .split(separator)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Inline edit form. Bullets are a textarea (one per line) and keywords a single comma-separated
 * input: plain text fields are simpler to edit and validate than a dynamic list of inputs. The
 * output is the PATCH body, with the same limits the backend enforces.
 */
export const summaryFormSchema = z.object({
  overview: z
    .string()
    .trim()
    .min(1, "The overview can't be empty")
    .max(SUMMARY_OVERVIEW_MAX_LENGTH, `Keep it under ${SUMMARY_OVERVIEW_MAX_LENGTH} characters`),
  // Lists are validated as a whole (refine) so the error lands on the field itself, which is where
  // the form shows it, rather than on an index like `bullet_points.3`.
  bullet_points: z
    .string()
    .transform((value) => splitEntries(value, BULLET_SEPARATOR))
    .refine(
      (bullets) => bullets.every((bullet) => bullet.length <= SUMMARY_BULLET_MAX_LENGTH),
      `Each note must be under ${SUMMARY_BULLET_MAX_LENGTH} characters`,
    ),
  keywords: z
    .string()
    .transform((value) => splitEntries(value, KEYWORD_SEPARATOR))
    .refine(
      (keywords) => keywords.every((keyword) => keyword.length <= SUMMARY_KEYWORD_MAX_LENGTH),
      `Each keyword must be under ${SUMMARY_KEYWORD_MAX_LENGTH} characters`,
    )
    .refine(
      (keywords) => keywords.length <= SUMMARY_MAX_KEYWORDS,
      `Use at most ${SUMMARY_MAX_KEYWORDS} keywords`,
    ),
});

// Input type = strings as typed in the form; output type = the arrays after `.transform()`.
export type SummaryFormInput = z.input<typeof summaryFormSchema>;
export type SummaryFormOutput = z.output<typeof summaryFormSchema>;

/** Current summary → the strings the form fields edit. */
// @param summary the saved summary; @returns the initial values for the edit form
export function toSummaryFormInput(summary: MeetingSummary): SummaryFormInput {
  return {
    overview: summary.overview,
    bullet_points: summary.bullet_points.join(BULLET_SEPARATOR),
    keywords: summary.keywords.join(`${KEYWORD_SEPARATOR} `),
  };
}
