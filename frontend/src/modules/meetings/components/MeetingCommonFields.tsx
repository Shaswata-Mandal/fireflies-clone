/**
 * Fields shared by the create and edit forms.
 *
 * WHAT: Title, date/time, participants and (create only) the "Generate AI summary" checkbox.
 * LAYER: Module component (client).
 * CALLED BY: `CreateMeetingForm`, `EditMeetingForm`.
 * CALLS: `FormField`, `ParticipantTagInput`.
 * INTERVIEW: the parent passes in `register(...)` results (`UseFormRegisterReturn`), which is how
 * react-hook-form connects a plain <input>; spreading `{...titleField}` adds name, ref, onChange.
 */

"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { INPUT_CLASS } from "@/modules/meetings/components/form-classes";
import { ParticipantTagInput } from "@/modules/meetings/components/ParticipantTagInput";
import type { ParticipantDraft } from "@/modules/meetings/types";
import { FormField, fieldErrorId } from "@/shared/components/FormField";

interface MeetingCommonFieldsProps {
  idPrefix: string;
  titleField: UseFormRegisterReturn;
  dateField: UseFormRegisterReturn;
  errors: { title?: string; meeting_date?: string };
  participants: ParticipantDraft[];
  onParticipantsChange: (next: ParticipantDraft[]) => void;
  /** Present on the create form only; edit has no summary option. */
  summaryField?: UseFormRegisterReturn;
}

/** Title, date and time, participants and (create only) "Generate AI summary". Shared by create and edit. */
export function MeetingCommonFields({
  idPrefix,
  titleField,
  dateField,
  errors,
  participants,
  onParticipantsChange,
  summaryField,
}: MeetingCommonFieldsProps) {
  // Unique ids tie each <label> to its input and each error message to its input (accessibility).
  const titleId = `${idPrefix}-title`;
  const dateId = `${idPrefix}-date`;

  return (
    <div className="flex flex-col gap-4">
      <FormField htmlFor={titleId} label="Title" error={errors.title}>
        <input
          id={titleId}
          autoComplete="off"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? fieldErrorId(titleId) : undefined}
          className={INPUT_CLASS}
          {...titleField}
        />
      </FormField>
      <FormField htmlFor={dateId} label="Date and time" error={errors.meeting_date}>
        <input
          id={dateId}
          type="datetime-local"
          aria-invalid={Boolean(errors.meeting_date)}
          aria-describedby={errors.meeting_date ? fieldErrorId(dateId) : undefined}
          className={INPUT_CLASS}
          {...dateField}
        />
      </FormField>
      <ParticipantTagInput
        id={`${idPrefix}-participants`}
        value={participants}
        onChange={onParticipantsChange}
      />
      {summaryField && (
        <label className="flex items-center gap-2 text-sm text-default">
          <input type="checkbox" className="size-4 accent-primary-600" {...summaryField} />
          Generate AI summary
        </label>
      )}
    </div>
  );
}
