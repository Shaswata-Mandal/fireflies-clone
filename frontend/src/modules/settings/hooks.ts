"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/modules/settings/api";
import { queryKeys } from "@/shared/constants/query-keys";

/** The signed-in user. Without real auth this is the seeded default user, so it never goes stale. */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getCurrentUser,
    staleTime: Infinity,
  });
}
