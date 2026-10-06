"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getMeeting, listMeetings, listParticipants } from "@/modules/meetings/api";
import type { MeetingsQuery } from "@/modules/meetings/types";
import { queryKeys } from "@/shared/constants/query-keys";

const PARTICIPANTS_STALE_TIME_MS = 5 * 60_000;

/** One page of the meetings library. Each filter combination is its own cache entry. */
export function useMeetings(query: MeetingsQuery) {
  return useQuery({
    queryKey: queryKeys.meetings.list(query),
    queryFn: ({ signal }) => listMeetings(query, signal),
    // Keep showing the old page while the next filter/page loads instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

/** Full meeting (participants with email/role, summary…). `enabled` lets popups fetch lazily. */
export function useMeeting(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.meetings.detail(id),
    queryFn: ({ signal }) => getMeeting(id, signal),
    enabled,
  });
}

/** Everyone who attends one of the user's meetings (filter dropdown). Changes rarely. */
export function useParticipants() {
  return useQuery({
    queryKey: queryKeys.participants.all,
    queryFn: ({ signal }) => listParticipants(signal),
    staleTime: PARTICIPANTS_STALE_TIME_MS,
  });
}
