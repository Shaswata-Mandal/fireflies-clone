// One place for TanStack Query keys, so invalidations always hit the same arrays the queries use.
// Hierarchical: invalidating `meetings.all` also invalidates every list and detail under it.

export const queryKeys = {
  me: ["me"] as const,
  meetings: {
    all: ["meetings"] as const,
    lists: () => [...queryKeys.meetings.all, "list"] as const,
    list: (params: object) => [...queryKeys.meetings.lists(), params] as const,
    detail: (id: number) => [...queryKeys.meetings.all, "detail", id] as const,
    // Nested under the detail key: invalidating a meeting also refreshes its transcript.
    transcript: (id: number) => [...queryKeys.meetings.detail(id), "transcript"] as const,
  },
  participants: {
    all: ["participants"] as const,
  },
  // Top-level, not under meetings.detail: a summary edit invalidates the meeting without refetching
  // its action items, and a future cross-meeting "my tasks" list can live under `all` too.
  actionItems: {
    all: ["action-items"] as const,
    open: (limit: number) => [...queryKeys.actionItems.all, "open", limit] as const,
    byMeeting: (meetingId: number) => [...queryKeys.actionItems.all, "meeting", meetingId] as const,
  },
};
