"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { MeetingCommonFields } from "@/modules/meetings/components/MeetingCommonFields";
import { FORM_COPY } from "@/modules/meetings/constants";
import { isoToLocalInput, localInputToIso } from "@/modules/meetings/datetime";
import { useUpdateMeeting } from "@/modules/meetings/hooks";
import { buildMeetingPatch } from "@/modules/meetings/meeting-patch";
import {
  editMeetingSchema,
  type EditMeetingFormOutput,
  type EditMeetingFormValues,
} from "@/modules/meetings/schemas";
import type { MeetingDetail } from "@/modules/meetings/types";
import { Button } from "@/shared/components/ui/button";

interface EditMeetingFormProps {
  meeting: MeetingDetail;
  /** Rename: put the cursor in the title with its text selected. */
  focusTitle: boolean;
  onDone: () => void;
  onPendingChange: (isPending: boolean) => void;
}

/** Title, date and participants of an existing meeting. Sends only what changed. */
export function EditMeetingForm({
  meeting,
  focusTitle,
  onDone,
  onPendingChange,
}: EditMeetingFormProps) {
  const idPrefix = useId();
  const updateMutation = useUpdateMeeting(meeting.id);
  const { isPending } = updateMutation;
  const {
    register,
    handleSubmit,
    control,
    setFocus,
    formState: { errors },
  } = useForm<EditMeetingFormValues, unknown, EditMeetingFormOutput>({
    resolver: zodResolver(editMeetingSchema),
    defaultValues: {
      title: meeting.title,
      meeting_date: isoToLocalInput(meeting.meeting_date),
      participants: meeting.participants.map(({ name, email }) => ({ name, email })),
    },
  });

  useEffect(() => setFocus("title", { shouldSelect: focusTitle }), [setFocus, focusTitle]);
  useEffect(() => onPendingChange(isPending), [isPending, onPendingChange]);

  async function onSubmit(values: EditMeetingFormOutput) {
    const meeting_date = localInputToIso(values.meeting_date) ?? meeting.meeting_date;
    const patch = buildMeetingPatch(meeting, { ...values, meeting_date });
    // Nothing changed: skip the request instead of sending an empty PATCH.
    if (Object.keys(patch).length === 0) return onDone();
    try {
      await updateMutation.mutateAsync(patch);
      onDone();
    } catch {
      // The global handler toasted the error; keep the dialog open so the edits aren't lost.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Edit meeting">
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-5">
        <Controller
          control={control}
          name="participants"
          render={({ field }) => (
            <MeetingCommonFields
              idPrefix={idPrefix}
              titleField={register("title")}
              dateField={register("meeting_date")}
              errors={{ title: errors.title?.message, meeting_date: errors.meeting_date?.message }}
              participants={field.value}
              onParticipantsChange={field.onChange}
            />
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="lg" onClick={onDone}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            className="bg-primary-600 px-5 text-on-primary hover:bg-primary-700"
          >
            {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isPending ? FORM_COPY.SAVING : "Save"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
