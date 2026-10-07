"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import type { MeetingSummary } from "@/modules/meetings/types";
import { useUpdateSummary } from "@/modules/summary/hooks";
import {
  summaryFormSchema,
  toSummaryFormInput,
  type SummaryFormInput,
  type SummaryFormOutput,
} from "@/modules/summary/schema";
import { FormField, fieldErrorId } from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";

interface SummaryEditFormProps {
  meetingId: number;
  summary: MeetingSummary;
  onDone: () => void;
}

const FIELD_CLASS =
  "w-full rounded-md border border-strong bg-card px-3 py-2 text-sm leading-6 text-body outline-none placeholder:text-muted focus:border-focus aria-invalid:border-danger-fg";

/** Inline edit of overview, bullets (one per line) and keywords (comma-separated). Esc cancels. */
export function SummaryEditForm({ meetingId, summary, onDone }: SummaryEditFormProps) {
  const update = useUpdateSummary(meetingId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SummaryFormInput, unknown, SummaryFormOutput>({
    resolver: zodResolver(summaryFormSchema),
    defaultValues: toSummaryFormInput(summary),
  });

  const onSubmit = (values: SummaryFormOutput) => update.mutate(values, { onSuccess: onDone });

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape" && !update.isPending) onDone();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={handleKeyDown}
      aria-label="Edit summary"
      noValidate
    >
      {/* A disabled fieldset disables every control inside it: no double submits while saving. */}
      <fieldset disabled={update.isPending} className="flex flex-col gap-5">
        <FormField htmlFor="summary-overview" label="Overview" error={errors.overview?.message}>
          <textarea
            id="summary-overview"
            rows={6}
            autoFocus
            aria-invalid={Boolean(errors.overview)}
            aria-describedby={errors.overview ? fieldErrorId("summary-overview") : undefined}
            className={FIELD_CLASS}
            {...register("overview")}
          />
        </FormField>

        <FormField
          htmlFor="summary-keywords"
          label="Keywords"
          hint="Separate keywords with commas."
          error={errors.keywords?.message}
        >
          <input
            id="summary-keywords"
            aria-invalid={Boolean(errors.keywords)}
            aria-describedby={errors.keywords ? fieldErrorId("summary-keywords") : undefined}
            className={FIELD_CLASS}
            {...register("keywords")}
          />
        </FormField>

        <FormField
          htmlFor="summary-bullets"
          label="Notes"
          hint="One note per line."
          error={errors.bullet_points?.message}
        >
          <textarea
            id="summary-bullets"
            rows={6}
            aria-invalid={Boolean(errors.bullet_points)}
            aria-describedby={errors.bullet_points ? fieldErrorId("summary-bullets") : undefined}
            className={FIELD_CLASS}
            {...register("bullet_points")}
          />
        </FormField>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit">{update.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </fieldset>
    </form>
  );
}
