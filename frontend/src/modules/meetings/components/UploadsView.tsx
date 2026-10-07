"use client";

import { CreateMeetingForm } from "@/modules/meetings/components/CreateMeetingForm";

/** The /uploads page (screenshot 28): the same create form as the modal, laid out full-width. */
export function UploadsView() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-primary">Add a meeting</h1>
      <CreateMeetingForm variant="page" />
    </div>
  );
}
