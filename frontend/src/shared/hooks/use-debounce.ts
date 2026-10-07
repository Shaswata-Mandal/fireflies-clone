/**
 * Debounce hook.
 *
 * WHAT: Delays a fast-changing value (a search box) so work only happens after the user pauses.
 * LAYER: Shared hook.
 * CALLED BY: search inputs (library search, transcript search, navbar search).
 * CALLS: React hooks only.
 * MERN EQUIVALENT: `lodash.debounce` or a `useDebounce` hook from usehooks.
 */

"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stopped changing for `delayMs` (search inputs, filters).
 * @param value the live value (e.g. what the user has typed so far)
 * @param delayMs how long it must stay unchanged before the returned value updates
 * @returns the delayed value; `<T>` is a generic, so it works for strings, numbers, objects...
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  // useState (not a ref): the delayed value must trigger a re-render when it finally changes.
  const [debounced, setDebounced] = useState(value);

  // The effect re-runs whenever `value` or `delayMs` changes: it starts a new timer each time.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    // A new value before the timer fires cancels the pending update.
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
