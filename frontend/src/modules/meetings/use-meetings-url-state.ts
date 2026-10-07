/**
 * Library view state stored in the URL.
 *
 * WHAT: Exposes the parsed state plus `update` (patch some fields) and `setState` (replace all).
 * LAYER: Module hook.
 * CALLED BY: `MeetingsView` and the toolbar / filter components.
 * CALLS: `url-state.ts`, Next.js router hooks.
 * MERN EQUIVALENT: a `useSearchParams` wrapper in React Router.
 * INTERVIEW: the state is derived from the URL on every render (no copy in `useState`), so there
 * is exactly one source of truth and Back/Forward work for free.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  parseMeetingsParams,
  serializeMeetingsParams,
  type MeetingsUrlState,
} from "@/modules/meetings/url-state";

interface UpdateOptions {
  /** Replace the history entry instead of pushing one (used for debounced typing). */
  replace?: boolean;
}

/**
 * The URL is the single source of truth for the library view, so reload, Back and shared links all
 * restore it. Any change other than `page` itself jumps back to page 1 (page 3 of old results is
 * meaningless for new filters).
 */
export function useMeetingsUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // useMemo: re-parse only when the query string really changed, and keep `state` referentially
  // stable between renders (it is used in other hooks' dependency arrays).
  const state = useMemo(
    () => parseMeetingsParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setState = useCallback(
    (next: MeetingsUrlState, { replace = false }: UpdateOptions = {}) => {
      const query = serializeMeetingsParams(next);
      const href = query ? `${pathname}?${query}` : pathname;
      // scroll: false keeps the toolbar in place while the list underneath changes.
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const update = useCallback(
    (patch: Partial<MeetingsUrlState>, options?: UpdateOptions) => {
      // Changing a filter or sort invalidates the current page number, so go back to page 1
      // unless the caller is explicitly changing the page.
      const resetPage = !("page" in patch);
      setState({ ...state, ...patch, ...(resetPage ? { page: 1 } : {}) }, options);
    },
    [setState, state],
  );

  return { state, update, setState };
}
