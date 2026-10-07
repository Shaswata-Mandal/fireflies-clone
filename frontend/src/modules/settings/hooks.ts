/**
 * Current-user hook.
 *
 * WHAT: One `useQuery` for the signed-in user, shared by the avatar menu, greeting, settings
 *   and team screens.
 * LAYER: Module hooks layer.
 * CALLED BY: many components (the same key means ONE request, shared).
 * CALLS: `settings/api.ts`, `queryKeys.me`.
 * MERN EQUIVALENT: a `useAuth()` / `useUser()` hook.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/modules/settings/api";
import { queryKeys } from "@/shared/constants/query-keys";

/** The signed-in user. Without real auth this is the seeded default user, so it never goes stale. */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getCurrentUser,
    // Never refetch automatically: the default user cannot change while the app is open.
    staleTime: Infinity,
  });
}
