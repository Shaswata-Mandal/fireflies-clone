"use client";

import { useState } from "react";
import { CreateMeetingForm } from "@/modules/meetings/components/CreateMeetingForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface CreateMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal wrapper around the shared form. While a request is in flight Esc, outside clicks and the
 * close button are disabled, so the dialog can't be dismissed mid-upload. Radix traps focus and
 * returns it to whatever opened the dialog (the navbar Upload button or a menu item).
 */
export function CreateMeetingModal({ open, onOpenChange }: CreateMeetingModalProps) {
  const [isPending, setPending] = useState(false);

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
        className="max-h-[90vh] max-w-xl overflow-y-auto p-6"
      >
        <DialogTitle className="text-lg">Create meeting</DialogTitle>
        <DialogDescription className="mt-1 mb-5">
          Upload a transcript, paste one, or add the details by hand.
        </DialogDescription>
        <CreateMeetingForm
          variant="modal"
          onCreated={() => onOpenChange(false)}
          onPendingChange={setPending}
        />
      </DialogContent>
    </Dialog>
  );
}
