"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { parseTabParam } from "@/shared/utils/tab-param";

const TAB_PARAM = "tab";

/**
 * The active tab lives in `?tab=` so reload, Back and shared links restore it. Tab switches replace
 * the history entry (they are not navigation). Callers must sit under a Suspense boundary.
 */
export function useTabParam<TId extends string>(
  ids: ReadonlyArray<TId>,
  fallback: TId,
): [TId, (id: TId) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseTabParam(searchParams.get(TAB_PARAM), ids, fallback);

  const setActive = useCallback(
    (id: TId) => {
      router.replace(`${pathname}?${TAB_PARAM}=${id}`, { scroll: false });
    },
    [pathname, router],
  );

  return [active, setActive];
}
