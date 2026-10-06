"use client";

import { useEffect } from "react";

/**
 * Space would also activate a focused button, type into a field, or move a slider/menu. In those
 * places the element's own behaviour wins, otherwise one key press would do two things.
 */
const SPACE_OWNERS =
  "input, textarea, select, button, a[href], [role='slider'], [role='menuitem'], " +
  "[role='menuitemradio'], [role='option'], [role='tab']";

function isSpaceOwnedByTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest(SPACE_OWNERS) !== null;
}

/** Space toggles play/pause anywhere on the page except where Space already means something. */
export function usePlayerHotkeys(toggle: () => void, enabled: boolean): void {
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
