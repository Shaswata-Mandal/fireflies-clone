"use client";

import type { ReactNode, RefObject } from "react";
import { focusRef } from "@/shared/utils/focus";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Label while `isPending`; defaults to the confirm label. */
  pendingLabel?: string;
  onConfirm: () => void;
  /** While true the dialog can't be dismissed and both buttons are locked. */
  isPending?: boolean;
  /** Where focus goes on close when the dialog was opened from a menu item (which is gone by then). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Destructive confirmation. Radix Dialog traps focus, closes on Esc and returns focus to the
 * trigger. Focus starts on Cancel, so a stray Enter can't delete. Not dismissable while the request
 * is in flight, so the user can't lose track of a half-finished delete.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  onConfirm,
  isPending = false,
  returnFocusRef,
}: ConfirmDialogProps) {
  function handleOpenChange(next: boolean) {
    if (isPending) return;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        onEscapeKeyDown={(event) => isPending && event.preventDefault()}
        onInteractOutside={(event) => isPending && event.preventDefault()}
        onCloseAutoFocus={(event) => focusRef(event, returnFocusRef)}
        className="max-w-md p-6"
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription asChild>
          <div className="mt-2 break-words">{description}</div>
        </DialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="lg" autoFocus disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" size="lg" onClick={onConfirm} disabled={isPending}>
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
