/**
 * "Latest value" ref hook.
 *
 * WHAT: Keeps a ref pointing at the newest value of something that changes every render.
 * LAYER: Shared hook.
 * CALLED BY: player and transcript hooks that run long-lived loops or DOM listeners.
 * CALLS: React hooks only.
 * MERN EQUIVALENT: the classic "useRef to avoid a stale closure" pattern.
 */

"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * A ref that always holds the latest `value`. Lets long-lived callbacks (rAF loops, DOM listeners)
 * read current props without being recreated, and without re-attaching listeners on every render.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  // INTERVIEW: useRef vs useState. A ref holds a value that can change WITHOUT causing a
  // re-render, which is exactly what a long-lived callback needs: it reads `ref.current` on each
  // call and always sees the latest value (no stale closure).
  const ref = useRef(value);
  // No dependency array: runs after every render to keep the ref current. It is written in an
  // effect (not during render) so React's rules about pure rendering are respected.
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
