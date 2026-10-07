/**
 * Raw HTTP call for the transcript.
 *
 * WHAT: Fetches all segments of one meeting.
 * LAYER: Module API layer: components -> hooks.ts -> THIS FILE -> `apiClient` -> backend.
 * CALLED BY: `transcript/hooks.ts`.
 * CALLS: `shared/lib/api-client.ts` (GET /meetings/{id}/transcript).
 */

import type { Transcript } from "@/modules/transcript/types";
import { apiClient } from "@/shared/lib/api-client";

// @param signal lets TanStack Query cancel the request when the component unmounts
export async function getTranscript(meetingId: number, signal?: AbortSignal): Promise<Transcript> {
  const { data } = await apiClient.get<Transcript>(`/meetings/${meetingId}/transcript`, {
    signal,
  });
  return data;
}
