/**
 * Delete-action-item confirmation.
 *
 * WHAT: The generic `ConfirmDialog` with action-item wording.
 * LAYER: Module component (client).
 * CALLED BY: `ActionItemRow`.
 * CALLS: `ConfirmDialog`.
 */

"use client";

import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

interface DeleteActionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemText: string;
  onConfirm: () => void;
}

/** Confirmation before deleting one action item; the dialog mechanics live in ConfirmDialog. */
export function DeleteActionItemDialog({
  open,
  onOpenChange,
  itemText,
  onConfirm,
}: DeleteActionItemDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete action item?"
      description={
        <p>
          &ldquo;{itemText}&rdquo; will be removed from this meeting. This can&apos;t be undone.
        </p>
      }
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
