/**
 * Keyboard navigation for tab lists.
 *
 * WHAT: Computes which tab to activate for an arrow/Home/End key press.
 * LAYER: Shared util (pure, unit-tested).
 * CALLED BY: `components/TabList.tsx`.
 * CALLS: nothing.
 * MERN EQUIVALENT: the keyboard logic inside Reach UI / Radix Tabs, written by hand.
 */

/**
 * WAI-ARIA tabs keyboard model for a horizontal tablist: ←/→ move (wrapping), Home/End jump to the
 * ends. Returns the index to activate, or null for keys the tablist doesn't handle.
 */
// @param key a KeyboardEvent.key; @param currentIndex the active tab; @param count number of tabs
export function nextTabIndex(key: string, currentIndex: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowRight":
      return (currentIndex + 1) % count;
    case "ArrowLeft":
      // `+ count` first, because `%` of a negative number stays negative in JavaScript.
      return (currentIndex - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
