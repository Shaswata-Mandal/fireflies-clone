"use client";

import { useState, type RefObject } from "react";
import { EditMeetingForm } from "@/modules/meetings/components/EditMeetingForm";
import { useMeeting } from "@/modules/meetings/hooks";
import { ErrorState } from "@/shared/components/ErrorState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { focusRef } from "@/shared/utils/focus";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface EditMeetingModalProps {
  meetingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened from "Rename": select the title text on open. */
  focusTitle?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Edit title, date and participants. The library row has no emails, so the full meeting is fetched
 * while the dialog is open (and is shared with the detail page's cache). Loading and error states
 * render inside the dialog; the form mounts once the data is there, so it starts prefilled.
 */
export function EditMeetingModal({
  meetingId,
  open,
  onOpenChange,
  focusTitle = false,
  returnFocusRef,
}: EditMeetingModalProps) {
  const [isPending, setPending] = useState(false);
  const {
    data: meeting,
    isPending: isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useMeeting(meetingId, open);

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
        className="max-h-[90vh] max-w-xl overflow-y-auto p-6"
      >
        <DialogTitle className="text-lg">Edit meeting</DialogTitle>
        <DialogDescription className="mt-1 mb-5">
          Change the title, date or who attended.
        </DialogDescription>
        {meeting ? (
          <EditMeetingForm
            meeting={meeting}
            focusTitle={focusTitle}
            onDone={() => onOpenChange(false)}
            onPendingChange={setPending}
          />
        ) : isError ? (
          <ErrorState
            title="Couldn't load this meeting"
            error={error}
            onRetry={() => void refetch()}
            isRetrying={isRefetching}
          />
        ) : (
          isLoading && (
            <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading meeting">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
