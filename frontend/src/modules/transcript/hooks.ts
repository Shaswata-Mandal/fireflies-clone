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
