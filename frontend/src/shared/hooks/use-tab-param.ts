/**
 * Tab state stored in the URL (`?tab=`).
 *
 * WHAT: Reads the active tab from the query string and returns a setter that updates the URL.
 * LAYER: Shared hook.
 * CALLED BY: Settings, Team and meeting-detail tab bars.
 * CALLS: `useRouter`, `usePathname`, `useSearchParams` (Next.js) and `utils/tab-param.ts`.
 * MERN EQUIVALENT: `useSearchParams()` from React Router.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { parseTabParam } from "@/shared/utils/tab-param";

const TAB_PARAM = "tab";

/**
 * The active tab lives in `?tab=` so reload, Back and shared links restore it. Tab switches replace
 * the history entry (they are not navigation). Callers must sit under a Suspense boundary.
 */
// `<TId extends string>` is a generic: the caller's own union of tab ids ("summary" | "notes")
// flows through, so `setActive("typo")` is a compile error.
export function useTabParam<TId extends string>(
  ids: ReadonlyArray<TId>,
  fallback: TId,
): [TId, (id: TId) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseTabParam(searchParams.get(TAB_PARAM), ids, fallback);

  // `replace` (not `push`) so tab clicks don't fill the Back-button history; `scroll: false`
  // stops Next.js jumping to the top of the page.
  const setActive = useCallback(
    (id: TId) => {
      router.replace(`${pathname}?${TAB_PARAM}=${id}`, { scroll: false });
    },
    [pathname, router],
  );

  return [active, setActive];
}
