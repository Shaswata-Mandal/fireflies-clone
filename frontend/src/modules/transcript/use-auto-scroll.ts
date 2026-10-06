"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUTO_SCROLL_PAUSE_MS, SCROLL_KEYS } from "@/modules/transcript/constants";
import { isLineOffscreen, scrollLineToCenter } from "@/modules/transcript/dom";

const NEVER = Number.NEGATIVE_INFINITY;

interface AutoScroll {
  /** The active line is outside the visible area (drives the "Jump to current" button). */
  isActiveOffscreen: boolean;
  jumpToCurrent: () => void;
  /** For scrolls the hook can't see as user input, e.g. jumping to a search match. */
  suspendAutoScroll: () => void;
}

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/**
 * Keeps the active line centred while playing, unless the user scrolled by hand in the last
 * AUTO_SCROLL_PAUSE_MS. "By hand" is detected from intent events (wheel, touch, scroll keys,
 * dragging the scrollbar), not from `scroll`, because our own smooth scrolling fires `scroll` too.
 */
export function useAutoScroll(container: HTMLElement | null, activeIndex: number): AutoScroll {
  const lastManualScrollAtRef = useRef(NEVER);
  const activeIndexRef = useRef(activeIndex);
  const [isActiveOffscreen, setActiveOffscreen] = useState(false);

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
    const handleScroll = () => {
      setActiveOffscreen(
        activeIndexRef.current >= 0 && isLineOffscreen(container, activeIndexRef.current),
      );
    };

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

  // Follow the active line when it changes.
  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (!container || activeIndex < 0) return;

    const isSuspended = performance.now() - lastManualScrollAtRef.current < AUTO_SCROLL_PAUSE_MS;
    if (!isSuspended) scrollLineToCenter(container, activeIndex);

    // Measure after layout; if we scrolled, the scroll listener will update it again when done.
    const frame = requestAnimationFrame(() =>
      setActiveOffscreen(isLineOffscreen(container, activeIndex)),
    );
    return () => cancelAnimationFrame(frame);
  }, [container, activeIndex]);

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
