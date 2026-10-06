// One place for TanStack Query keys, so invalidations always hit the same arrays the queries use.

export const queryKeys = {
  me: ["me"] as const,
};
