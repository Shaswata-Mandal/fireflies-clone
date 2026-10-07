"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

interface DeleteActionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemText: string;
  onConfirm: () => void;
}

/**
 * Confirmation before delete. Radix Dialog traps focus, closes on Esc and returns focus to the
 * trigger. Focus starts on Cancel, so a stray Enter can't delete.
 */
export function DeleteActionItemDialog({
  open,
  onOpenChange,
  itemText,
  onConfirm,
}: DeleteActionItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogTitle>Delete action item?</DialogTitle>
        <DialogDescription className="mt-2 break-words">
          &ldquo;{itemText}&rdquo; will be removed from this meeting. This can&apos;t be undone.
        </DialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="lg" autoFocus>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" size="lg" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
