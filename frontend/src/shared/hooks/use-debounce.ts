"use client";

import { useEffect, useState } from "react";

/** Returns `value` once it has stopped changing for `delayMs` (search inputs, filters). */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    // A new value before the timer fires cancels the pending update.
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
