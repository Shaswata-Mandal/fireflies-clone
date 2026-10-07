import type { RefObject } from "react";

/**
 * For a Radix `onCloseAutoFocus`: send focus to `ref` instead of Radix's default. Needed when the
 * dialog was opened from a dropdown item, because that item no longer exists when the dialog closes.
 */
export function focusRef(event: Event, ref?: RefObject<HTMLElement | null>): void {
  if (!ref?.current) return;
  event.preventDefault();
  ref.current.focus();
}
