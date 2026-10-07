/**
 * Keyboard shortcut: Space toggles play/pause.
 *
 * WHAT: A global `keydown` listener that ignores Space where it already has a meaning.
 * LAYER: Module hook (client).
 * CALLED BY: `PlayerBar`.
 * CALLS: the browser's `window.addEventListener`.
 * MERN EQUIVALENT: a `useHotkeys` hook (react-hotkeys-hook).
 */

"use client";

import { useEffect } from "react";

/**
 * Space would also activate a focused button, type into a field, or move a slider/menu. In those
 * places the element's own behaviour wins, otherwise one key press would do two things.
 */
const SPACE_OWNERS =
  "input, textarea, select, button, a[href], [role='slider'], [role='menuitem'], " +
  "[role='menuitemradio'], [role='option'], [role='tab']";

// @param target the element that had focus when the key was pressed
// `closest(selector)` walks up the DOM tree, so a click on an icon inside a button also counts.
function isSpaceOwnedByTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest(SPACE_OWNERS) !== null;
}

/** Space toggles play/pause anywhere on the page except where Space already means something. */
// @param toggle called on Space; @param enabled false (no recording/duration) = do nothing
export function usePlayerHotkeys(toggle: () => void, enabled: boolean): void {
  // The listener is added once and removed in the cleanup; it is re-created only when `toggle`
  // or `enabled` changes (listed in the dependency array below).
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== " ") return;
      if (event.repeat || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isSpaceOwnedByTarget(event.target)) return;
      event.preventDefault(); // otherwise the page also scrolls
      toggle();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle, enabled]);
}
