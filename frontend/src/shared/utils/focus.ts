/**
 * Focus management helper for dialogs.
 *
 * WHAT: Chooses where keyboard focus lands when a Radix dialog closes.
 * LAYER: Shared util (accessibility).
 * CALLED BY: `ConfirmDialog` and other dialogs opened from dropdown menu items.
 * CALLS: nothing (DOM `focus()`).
 * MERN EQUIVALENT: manual `ref.current.focus()` after closing a modal.
 */

import type { RefObject } from "react";

/**
 * For a Radix `onCloseAutoFocus`: send focus to `ref` instead of Radix's default. Needed when the
 * dialog was opened from a dropdown item, because that item no longer exists when the dialog closes.
 */
// @param event Radix's close event; @param ref the element to focus instead (optional)
export function focusRef(event: Event, ref?: RefObject<HTMLElement | null>): void {
  if (!ref?.current) return;
  // Cancel Radix's own "return focus to the trigger", then focus our element.
  event.preventDefault();
  ref.current.focus();
}
