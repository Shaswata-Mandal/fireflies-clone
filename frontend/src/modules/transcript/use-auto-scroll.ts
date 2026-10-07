/**
 * Auto-follow of the playing line.
 *
 * WHAT: Keeps the active line centred while playing, pauses for 3 s when the user scrolls by
 *   hand, and reports when the active line is off screen (for the "Jump to current" button).
 * LAYER: Module hook (client; imperative DOM work inside effects).
 * CALLED BY: `TranscriptList`.
 * CALLS: `dom.ts`, constants.
 * INTERVIEW: the hard part is telling the USER scrolling from OUR scrolling. Our smooth scroll
 * also fires `scroll` events, so listening to `scroll` would pause auto-follow by itself. Instead
 * we listen to INTENT events (wheel, touchmove, scroll keys, scrollbar drag), which only a human
 * can produce, and remember when the last one happened.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUTO_SCROLL_PAUSE_MS, SCROLL_KEYS } from "@/modules/transcript/constants";
import { isLineOffscreen, scrollLineToCenter } from "@/modules/transcript/dom";

// "Never scrolled by hand": minus infinity is always more than 3 s ago, so auto-follow starts on.
const NEVER = Number.NEGATIVE_INFINITY;

interface AutoScroll {
  /** The active line is outside the visible area (drives the "Jump to current" button). */
  isActiveOffscreen: boolean;
  jumpToCurrent: () => void;
  /** For scrolls the hook can't see as user input, e.g. jumping to a search match. */
  suspendAutoScroll: () => void;
}

/** Arrow keys inside the search box must not count as scrolling the transcript. */
function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/**
 * Keeps the active line centred while playing, unless the user scrolled by hand in the last
 * AUTO_SCROLL_PAUSE_MS. "By hand" is detected from intent events (wheel, touch, scroll keys,
 * dragging the scrollbar), not from `scroll`, because our own smooth scrolling fires `scroll` too.
 */
// @param container the scrollable element (null until it mounts); @param activeIndex playing line
export function useAutoScroll(container: HTMLElement | null, activeIndex: number): AutoScroll {
  // INTERVIEW: refs vs state here.
  // - lastManualScrollAtRef: a timestamp. Changing it must NOT re-render, and listeners that run
  //   outside React need to read it, so it is a ref.
  // - activeIndexRef: lets the scroll listener (created once) read the latest active line.
  // - isActiveOffscreen: drives a visible button, so it IS state (a change must re-render).
  const lastManualScrollAtRef = useRef(NEVER);
  const activeIndexRef = useRef(activeIndex);
  const [isActiveOffscreen, setActiveOffscreen] = useState(false);

  // "Pause auto-follow now": just records the current time (performance.now() = ms since page load).
  const suspendAutoScroll = useCallback(() => {
    lastManualScrollAtRef.current = performance.now();
  }, []);

  // Intent listeners + visibility tracking on scroll.
  useEffect(() => {
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key) && !isTextField(event.target)) suspendAutoScroll();
    };
    // A pointerdown on the container itself (not a line) is a scrollbar drag.
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target === container) suspendAutoScroll();
    };
    // Any scroll (ours or the user's) updates whether the active line is visible.
    const handleScroll = () => {
      setActiveOffscreen(
        activeIndexRef.current >= 0 && isLineOffscreen(container, activeIndexRef.current),
      );
    };

    // `{ passive: true }` promises the browser we never call preventDefault, so scrolling can
    // stay smooth without waiting for our handler.
    container.addEventListener("wheel", suspendAutoScroll, { passive: true });
    container.addEventListener("touchmove", suspendAutoScroll, { passive: true });
    container.addEventListener("keydown", handleKeyDown);
    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", suspendAutoScroll);
      container.removeEventListener("touchmove", suspendAutoScroll);
      container.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [container, suspendAutoScroll]);

  // Follow the active line when it changes. Runs only when `activeIndex` changes (a few seconds
  // apart), never on every clock tick.
  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (!container || activeIndex < 0) return;

    // Suspended = the user scrolled by hand less than 3 seconds ago.
    const isSuspended = performance.now() - lastManualScrollAtRef.current < AUTO_SCROLL_PAUSE_MS;
    if (!isSuspended) scrollLineToCenter(container, activeIndex);

    // Measure after layout; if we scrolled, the scroll listener will update it again when done.
    const frame = requestAnimationFrame(() =>
      setActiveOffscreen(isLineOffscreen(container, activeIndex)),
    );
    return () => cancelAnimationFrame(frame);
  }, [container, activeIndex]);

  // The "Jump to current" button: forget the manual scroll and re-centre right away.
  const jumpToCurrent = useCallback(() => {
    lastManualScrollAtRef.current = NEVER;
    if (container && activeIndexRef.current >= 0) {
      scrollLineToCenter(container, activeIndexRef.current);
    }
  }, [container]);

  return {
    isActiveOffscreen: activeIndex >= 0 && isActiveOffscreen,
    jumpToCurrent,
    suspendAutoScroll,
  };
}
