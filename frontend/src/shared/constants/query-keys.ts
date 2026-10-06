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
};
