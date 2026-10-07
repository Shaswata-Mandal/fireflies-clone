/**
 * Raw HTTP calls for summaries.
 *
 * WHAT: Generate (or regenerate) a meeting's summary and edit it by hand.
 * LAYER: Module API layer: components -> hooks.ts -> THIS FILE -> `apiClient` -> backend.
 * CALLED BY: `summary/hooks.ts`.
 * CALLS: `shared/lib/api-client.ts`.
 * MERN EQUIVALENT: axios wrappers around `POST .../generate` and `PATCH .../summary`.
 */

import type { MeetingSummary } from "@/modules/meetings/types";
import type {
  GenerateSummaryRequest,
  GenerateSummaryResponse,
  SummaryUpdate,
} from "@/modules/summary/types";
import { apiClient } from "@/shared/lib/api-client";

/**
 * Generation runs the LLM when one is configured, which can take far longer than an ordinary
 * request; give it its own timeout instead of the client-wide one.
 */
const GENERATE_TIMEOUT_MS = 60_000;

/** POST /meetings/{id}/summary/generate, with a longer per-request timeout than the default. */
export async function generateSummary(
  meetingId: number,
  body: GenerateSummaryRequest,
): Promise<GenerateSummaryResponse> {
  const { data } = await apiClient.post<GenerateSummaryResponse>(
    `/meetings/${meetingId}/summary/generate`,
    body,
    { timeout: GENERATE_TIMEOUT_MS },
  );
  return data;
}

/** PATCH /meetings/{id}/summary: only the fields in `body` change. */
export async function updateSummary(
  meetingId: number,
  body: SummaryUpdate,
): Promise<MeetingSummary> {
  const { data } = await apiClient.patch<MeetingSummary>(`/meetings/${meetingId}/summary`, body);
  return data;
}
