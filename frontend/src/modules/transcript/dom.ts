// DOM helpers for the transcript scroll container. Lines are found by data attribute rather than a
// ref per line, so 1,000 memoized lines don't each need a ref callback.

const SEGMENT_INDEX_ATTRIBUTE = "data-segment-index";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function findLineElement(container: HTMLElement, index: number): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[${SEGMENT_INDEX_ATTRIBUTE}="${index}"]`);
}

/** True when the line is entirely above or below the container's visible area. */
export function isLineOffscreen(container: HTMLElement, index: number): boolean {
  const line = findLineElement(container, index);
  if (!line) return false;
  const view = container.getBoundingClientRect();
  const rect = line.getBoundingClientRect();
  return rect.bottom <= view.top || rect.top >= view.bottom;
}

/**
 * Centres a line inside the container. Unlike `element.scrollIntoView`, this scrolls only the
 * transcript, never the page or other ancestors. Smooth unless the user prefers reduced motion.
 */
export function scrollLineToCenter(container: HTMLElement, index: number): void {
  const line = findLineElement(container, index);
  if (!line) return;
  const view = container.getBoundingClientRect();
  const rect = line.getBoundingClientRect();
  const top = container.scrollTop + (rect.top - view.top) - (view.height - rect.height) / 2;
  const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  container.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
}
