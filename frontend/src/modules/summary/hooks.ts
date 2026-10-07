"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { MeetingDetail } from "@/modules/meetings/types";
import { generateSummary, updateSummary } from "@/modules/summary/api";
import { SUMMARY_COPY } from "@/modules/summary/constants";
import type { SummaryUpdate } from "@/modules/summary/types";
import { queryKeys } from "@/shared/constants/query-keys";

// The summary has no query of its own: it (and the chapters) arrive with `GET /meetings/{id}`, so
// these mutations write their result straight into that cache entry. Errors are toasted by the
// global MutationCache (shared/lib/query-client.ts).

/**
 * Regenerates summary + chapters and appends newly extracted action items (deduped by the server).
 * The response is written into the meeting cache at once; the invalidations then reconcile anything
 * else that changed (the action-items list, and the library's preview / open count).
 */
export function useGenerateSummary(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateSummary(meetingId, { include_action_items: true }),
    onSuccess: async ({ summary, chapters }) => {
      queryClient.setQueryData<MeetingDetail>(queryKeys.meetings.detail(meetingId), (meeting) =>
        meeting ? { ...meeting, summary, chapters } : meeting,
      );
      await Promise.all([
        // exact: the transcript key is nested under the detail key and didn't change.
        queryClient.invalidateQueries({
          queryKey: queryKeys.meetings.detail(meetingId),
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.byMeeting(meetingId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() }),
      ]);
      toast.success(SUMMARY_COPY.GENERATED);
    },
  });
}

/** Manual edit of overview / bullets / keywords. Waits for the server, then updates the cache. */
export function useUpdateSummary(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SummaryUpdate) => updateSummary(meetingId, body),
    onSuccess: async (summary) => {
      queryClient.setQueryData<MeetingDetail>(queryKeys.meetings.detail(meetingId), (meeting) =>
        meeting ? { ...meeting, summary } : meeting,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() });
      toast.success(SUMMARY_COPY.UPDATED);
    },
  });
}
