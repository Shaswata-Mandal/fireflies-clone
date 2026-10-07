/**
 * TypeScript types for the summary endpoints.
 *
 * WHAT: Request and response shapes for generate and edit.
 * LAYER: Module types (type-only).
 * CALLED BY: api.ts, hooks.ts.
 * CALLS: meetings types.
 */

// Mirrors backend/app/modules/summaries/schemas.py. The summary itself (`MeetingSummary`) and
// `Chapter` arrive inside the meeting detail, so they stay in modules/meetings/types.ts.
import type { Chapter, MeetingSummary } from "@/modules/meetings/types";

/** `PATCH /meetings/{id}/summary`: every field optional, none nullable. */
export interface SummaryUpdate {
  overview?: string;
  bullet_points?: string[];
  keywords?: string[];
}

/** `POST /meetings/{id}/summary/generate` */
export interface GenerateSummaryRequest {
  include_action_items: boolean;
}

export interface GenerateSummaryResponse {
  summary: MeetingSummary;
  chapters: Chapter[];
}
