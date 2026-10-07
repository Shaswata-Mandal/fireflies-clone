/**
 * Submit logic of the create-meeting form.
 *
 * WHAT: Picks the upload (multipart) or JSON endpoint by tab, and converts errors to form errors.
 * LAYER: Module hook.
 * CALLED BY: `CreateMeetingForm`.
 * CALLS: `useCreateMeeting`, `useUploadMeeting`, `form-errors.ts`, `datetime.ts`.
 * MERN EQUIVALENT: an `onSubmit` handler extracted into a hook.
 */

"use client";

import { localInputToIso } from "@/modules/meetings/datetime";
import { CREATE_TABS } from "@/modules/meetings/constants";
import { mapCreateError, type CreateFormError } from "@/modules/meetings/form-errors";
import { useCreateMeeting, useUploadMeeting } from "@/modules/meetings/hooks";
import type { CreateMeetingFormOutput } from "@/modules/meetings/schemas";
import type { MeetingDetail } from "@/modules/meetings/types";

// Another discriminated union: `ok` tells the caller which of the two shapes it has.
export type CreateOutcome =
  | { ok: true; meeting: MeetingDetail }
  /** `error` is null when there's nothing to show in the form (the global toast already did). */
  | { ok: false; error: CreateFormError | null };

/**
 * Turns validated form values into the right request: the upload tab goes to the multipart
 * endpoint, paste and manual to the JSON one. Never throws; failures come back as an outcome so the
 * form can place the message next to the right field.
 */
export function useCreateMeetingSubmit() {
  const createMutation = useCreateMeeting();
  const uploadMutation = useUploadMeeting();

  // @param values the validated form values; @returns an outcome object (this function never throws)
  async function submit(values: CreateMeetingFormOutput): Promise<CreateOutcome> {
    const meeting_date = localInputToIso(values.meeting_date);
    if (!meeting_date) {
      return {
        ok: false,
        error: { field: "meeting_date", message: "Enter a valid date and time" },
      };
    }
    const common = {
      title: values.title,
      meeting_date,
      participants: values.participants,
      generate_summary: values.generate_summary,
    };
    const isUpload = values.tab === CREATE_TABS.UPLOAD;

    // `mutateAsync` returns a Promise (unlike `mutate`), so we can `await` the created meeting
    // and catch a rejection with try/catch.
    try {
      if (isUpload && values.file) {
        return {
          ok: true,
          meeting: await uploadMutation.mutateAsync({ ...common, file: values.file }),
        };
      }
      const transcript =
        values.tab === CREATE_TABS.PASTE
          ? { transcript_text: values.transcript_text, transcript_format: values.transcript_format }
          : {};
      return { ok: true, meeting: await createMutation.mutateAsync({ ...common, ...transcript }) };
    } catch (error) {
      return { ok: false, error: mapCreateError(error, isUpload) };
    }
  }

  return { submit, isPending: createMutation.isPending || uploadMutation.isPending };
}
