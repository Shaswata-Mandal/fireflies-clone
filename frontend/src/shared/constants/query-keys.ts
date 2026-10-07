/**
 * Central registry of TanStack Query cache keys.
 *
 * WHAT: Functions and constants that build the array keys used by `useQuery` and invalidation.
 * LAYER: Shared constants.
 * CALLED BY: every module's `hooks.ts` (queries, optimistic updates, invalidation).
 * CALLS: nothing.
 * MERN EQUIVALENT: Redux action-type constants / RTK Query tag names, as a single typed object.
 */

// One place for TanStack Query keys, so invalidations always hit the same arrays the queries use.
// Hierarchical: invalidating `meetings.all` also invalidates every list and detail under it.

// INTERVIEW: a query key is the cache address of some data. Keys are arrays that go from general
// to specific (["meetings", "detail", 12]); invalidating a prefix refetches everything beneath it.
// `as const` makes each array a fixed tuple type instead of a loose `string[]`.
export const queryKeys = {
  me: ["me"] as const,
  meetings: {
    all: ["meetings"] as const,
    // `...arr` spreads the parent key into a new array, so child keys always start with the parent.
    lists: () => [...queryKeys.meetings.all, "list"] as const,
    // `params` (page, filters, sort) is part of the key, so each filter combination caches apart.
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
