/**
 * Transcript data hook.
 *
 * WHAT: One `useQuery` that loads a meeting's whole transcript.
 * LAYER: Module hooks layer.
 * CALLED BY: `TranscriptPanel`, `MeetingDetailLayout`, `SmartSearchPanel`, `SummaryPanel`.
 * CALLS: `transcript/api.ts`, `queryKeys`.
 * INTERVIEW: many components call this hook with the same key, so TanStack Query makes ONE
 * request and shares the cached result. The key is nested under the meeting's detail key, so
 * invalidating the meeting also refreshes its transcript.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { getTranscript } from "@/modules/transcript/api";
import { queryKeys } from "@/shared/constants/query-keys";

/** Whole transcript of one meeting; search and highlighting then run client-side (docs/api.md). */
export function useTranscript(meetingId: number) {
  return useQuery({
    queryKey: queryKeys.meetings.transcript(meetingId),
    queryFn: ({ signal }) => getTranscript(meetingId, signal),
  });
}
