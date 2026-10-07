/**
 * The create-meeting form (upload / paste / manual).
 *
 * WHAT: One react-hook-form instance for all three tabs; validates with zod, submits through
 *   `useCreateMeetingSubmit`, maps server errors to fields, then navigates to the new meeting.
 * LAYER: Module component (client).
 * CALLED BY: `CreateMeetingModal` (variant "modal") and the `/uploads` page (variant "page").
 * CALLS: `useForm` + `zodResolver`, `schemas.ts`, `useCreateMeetingSubmit`, field components.
 * MERN EQUIVALENT: a Formik form with a Yup schema and an axios POST in onSubmit.
 * INTERVIEW: react-hook-form uses uncontrolled inputs (`register`), so typing does not re-render
 * the form on every keystroke; `useWatch` subscribes only to the fields we need.
 */

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CreateMeetingTabs } from "@/modules/meetings/components/CreateMeetingTabs";
import { FormErrorBanner } from "@/modules/meetings/components/FormErrorBanner";
import { MeetingCommonFields } from "@/modules/meetings/components/MeetingCommonFields";
import { PasteTranscriptFields } from "@/modules/meetings/components/PasteTranscriptFields";
import { TranscriptFileDropzone } from "@/modules/meetings/components/TranscriptFileDropzone";
import { CREATE_TABS, FORM_COPY, type CreateTab } from "@/modules/meetings/constants";
import {
  createMeetingSchema,
  emptyCreateMeetingValues,
  type CreateMeetingFormOutput,
  type CreateMeetingFormValues,
} from "@/modules/meetings/schemas";
import type { MeetingDetail } from "@/modules/meetings/types";
import { titleFromFilename } from "@/modules/meetings/upload-file";
import { useCreateMeetingSubmit } from "@/modules/meetings/use-create-meeting-submit";
import { tabElementId, tabPanelElementId } from "@/shared/components/TabList";
import { Button } from "@/shared/components/ui/button";
import { meetingDetailRoute } from "@/shared/constants/routes";
import { showSuccessToast } from "@/shared/utils/toast";

interface CreateMeetingFormProps {
  variant: "modal" | "page";
  /** Called after a successful create, before navigating (the modal closes itself here). */
  onCreated?: (meeting: MeetingDetail) => void;
  /** Lets the modal block Esc / outside clicks while a request is in flight. */
  onPendingChange?: (isPending: boolean) => void;
}

/**
 * The create-meeting form shared by the navbar modal and the /uploads page. One react-hook-form
 * instance holds all three tabs, so switching tabs keeps the title, date and participants.
 */
export function CreateMeetingForm({ variant, onCreated, onPendingChange }: CreateMeetingFormProps) {
  // `useId` gives a stable unique id, so label/aria links stay valid if two forms ever coexist.
  const idPrefix = useId();
  const router = useRouter();
  const [bannerError, setBannerError] = useState<string | null>(null);
  const { submit, isPending } = useCreateMeetingSubmit();
  // The three generics are: the values the form holds, the validation context (unused), and the
  // values `handleSubmit` receives after zod has run.
  // `register("name")` wires an input to the form; `control` is for custom inputs (Controller).
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    getFieldState,
    formState: { errors },
  } = useForm<CreateMeetingFormValues, unknown, CreateMeetingFormOutput>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: emptyCreateMeetingValues(),
  });
  // `useWatch` re-renders this component only when these two fields change.
  const tab = useWatch({ control, name: "tab" });
  const file = useWatch({ control, name: "file" });

  // Tell the parent modal when a request starts/stops so it can block closing mid-upload.
  useEffect(() => onPendingChange?.(isPending), [isPending, onPendingChange]);

  function handleFileChange(next: File | null) {
    setValue("file", next, { shouldValidate: true, shouldDirty: true });
    // Default the title to the file name, but never overwrite something the user typed.
    if (next && !getFieldState("title").isDirty) {
      setValue("title", titleFromFilename(next.name), { shouldValidate: true });
    }
  }

  // Runs only after zod validation passes. `setError` places a server message under a field.
  async function onSubmit(values: CreateMeetingFormOutput) {
    setBannerError(null);
    const outcome = await submit(values);
    if (!outcome.ok) {
      const { error } = outcome;
      if (!error) return;
      if (error.field === "form") setBannerError(error.message);
      else setError(error.field, { type: "server", message: error.message });
      return;
    }
    const { meeting } = outcome;
    onCreated?.(meeting);
    const open = () => router.push(meetingDetailRoute(meeting.id));
    showSuccessToast(FORM_COPY.CREATED, { label: FORM_COPY.VIEW_MEETING, onClick: open });
    open();
  }

  // `noValidate` turns off the browser's own validation bubbles (zod messages replace them).
  // `<fieldset disabled>` disables every control inside while the request is running.
  // The Controller wraps the participants input because it is a custom component, not a plain
  // <input>, so it cannot use `register` directly.
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Create meeting">
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-5">
        <CreateMeetingTabs
          idPrefix={idPrefix}
          activeTab={tab}
          onChange={(next: CreateTab) => setValue("tab", next)}
        />
        {bannerError && <FormErrorBanner message={bannerError} />}

        <div
          role="tabpanel"
          id={tabPanelElementId(idPrefix, tab)}
          aria-labelledby={tabElementId(idPrefix, tab)}
          className="flex flex-col gap-4"
        >
          {tab === CREATE_TABS.UPLOAD && (
            <TranscriptFileDropzone
              id={`${idPrefix}-file`}
              file={file}
              error={errors.file?.message}
              disabled={isPending}
              variant={variant}
              onFileChange={handleFileChange}
            />
          )}
          {tab === CREATE_TABS.PASTE && (
            <PasteTranscriptFields
              idPrefix={idPrefix}
              formatField={register("transcript_format")}
              textField={register("transcript_text")}
              textError={errors.transcript_text?.message}
            />
          )}
          {tab === CREATE_TABS.MANUAL && (
            <p className="text-sm text-secondary">{FORM_COPY.MANUAL_HINT}</p>
          )}
        </div>

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
              summaryField={register("generate_summary")}
            />
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="bg-primary-600 px-5 text-on-primary hover:bg-primary-700"
          >
            {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isPending
              ? tab === CREATE_TABS.UPLOAD
                ? FORM_COPY.UPLOADING
                : FORM_COPY.SAVING
              : "Create meeting"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
