"use client";

import type { RefObject } from "react";
import { useDeleteMeeting } from "@/modules/meetings/hooks";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

interface DeleteMeetingDialogProps {
  meetingId: number;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs before the request, e.g. stop the player. */
  onBeforeDelete?: () => void;
  /** Runs once the server confirmed, e.g. leave the detail page. */
  onDeleted?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Confirmation for deleting a whole meeting. From the library the row disappears at once (the hook
 * is optimistic) and the dialog closes straight away; from the detail page `onDeleted` navigates.
 */
export function DeleteMeetingDialog({
  meetingId,
  title,
  open,
  onOpenChange,
  onBeforeDelete,
  onDeleted,
  returnFocusRef,
}: DeleteMeetingDialogProps) {
  const deleteMutation = useDeleteMeeting();

  function handleConfirm() {
    onBeforeDelete?.();
    deleteMutation.mutate(meetingId, { onSuccess: onDeleted });
    // The row is already gone from the library; a failure rolls it back and the global handler
    // toasts. On the detail page we stay open so the user can see the dialog is still working.
    if (!onDeleted) onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete meeting?"
      description={
        <p>
          <strong className="font-medium text-primary">&ldquo;{title}&rdquo;</strong> and its
          transcript, summary and action items will be permanently deleted. This can&apos;t be
          undone.
        </p>
      }
      confirmLabel="Delete meeting"
      pendingLabel="Deleting…"
      isPending={deleteMutation.isPending}
      returnFocusRef={returnFocusRef}
      onConfirm={handleConfirm}
    />
  );
}
