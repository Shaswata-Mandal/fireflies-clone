"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * A ref that always holds the latest `value`. Lets long-lived callbacks (rAF loops, DOM listeners)
 * read current props without being recreated, and without re-attaching listeners on every render.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
