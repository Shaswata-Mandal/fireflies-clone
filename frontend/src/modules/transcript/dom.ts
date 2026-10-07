/**
 * DOM helpers for the transcript scroll container.
 *
 * WHAT: Find a line's element, test whether it is on screen, and smoothly centre it.
 * LAYER: Module util (touches the DOM, so browser only; no React).
 * CALLED BY: `use-auto-scroll.ts` and `TranscriptList`.
 * CALLS: browser APIs (`querySelector`, `getBoundingClientRect`, `scrollTo`, `matchMedia`).
 * INTERVIEW: lines are found by a `data-segment-index` attribute instead of one ref per line, so
 * 1,000 memoised lines need no ref callbacks at all.
 */

// DOM helpers for the transcript scroll container. Lines are found by data attribute rather than a
// ref per line, so 1,000 memoized lines don't each need a ref callback.

const SEGMENT_INDEX_ATTRIBUTE = "data-segment-index";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// @param container the scrollable element; @param index the segment index; @returns the line or null
export function findLineElement(container: HTMLElement, index: number): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[${SEGMENT_INDEX_ATTRIBUTE}="${index}"]`);
}

/** True when the line is entirely above or below the container's visible area. */
export function isLineOffscreen(container: HTMLElement, index: number): boolean {
  const line = findLineElement(container, index);
  if (!line) return false;
  // `getBoundingClientRect()` gives an element's position relative to the browser window, so the
  // two rectangles can be compared directly. Off screen = completely above or completely below.
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
  // The maths: where the line is inside the scrollable content (current scroll + its offset from
  // the container's top), minus half of the free space, so the line ends up in the middle.
  const top = container.scrollTop + (rect.top - view.top) - (view.height - rect.height) / 2;
  // Respect the OS "reduce motion" setting (accessibility): jump instead of animating.
  const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  container.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
}
