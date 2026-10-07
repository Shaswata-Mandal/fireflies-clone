"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useId, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { AssigneeSelect } from "@/modules/action-items/components/AssigneeSelect";
import { ACTION_ITEMS_COPY } from "@/modules/action-items/constants";
import {
  actionItemFormSchema,
  EMPTY_ACTION_ITEM_FORM,
  type ActionItemFormInput,
  type ActionItemFormOutput,
} from "@/modules/action-items/schema";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { fieldErrorId } from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";

interface ActionItemFormProps {
  participants: ReadonlyArray<ParticipantBrief>;
  isPending: boolean;
  /** Resolves when the server accepted it; rejects on error (already toasted by the hook). */
  onSubmit: (values: ActionItemFormOutput) => Promise<unknown>;
  /** Edit mode: prefilled values plus Save / Cancel. Add mode (omitted): blank, resets after add. */
  edit?: { defaultValues: ActionItemFormInput; onCancel: () => void };
}

const INPUT_CLASS =
  "h-9 rounded-md border border-strong bg-card px-3 text-sm text-default outline-none placeholder:text-muted focus:border-focus aria-invalid:border-danger-fg";

/**
 * Add / edit an action item. Enter submits (it's a real <form>), Esc cancels an edit, and a disabled
 * <fieldset> locks every control while the request is in flight, so it can't be sent twice.
 */
export function ActionItemForm({ participants, isPending, onSubmit, edit }: ActionItemFormProps) {
  const idPrefix = useId();
  const textId = `${idPrefix}-text`;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActionItemFormInput, unknown, ActionItemFormOutput>({
    resolver: zodResolver(actionItemFormSchema),
    defaultValues: edit?.defaultValues ?? EMPTY_ACTION_ITEM_FORM,
  });

  async function submit(values: ActionItemFormOutput) {
    try {
      await onSubmit(values);
      if (!edit) reset(EMPTY_ACTION_ITEM_FORM);
    } catch {
      // The mutation already showed a toast; keep what the user typed so they can retry.
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (edit && event.key === "Escape" && !isPending) edit.onCancel();
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      onKeyDown={handleKeyDown}
      aria-label={edit ? "Edit action item" : "Add action item"}
      noValidate
    >
      <fieldset disabled={isPending} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={textId} className="sr-only">
            Action item
          </label>
          <input
            id={textId}
            placeholder={ACTION_ITEMS_COPY.ADD_PLACEHOLDER}
            autoFocus={Boolean(edit)}
            aria-invalid={Boolean(errors.text)}
            aria-describedby={errors.text ? fieldErrorId(textId) : undefined}
            className={`${INPUT_CLASS} min-w-48 flex-1`}
            {...register("text")}
          />
          <AssigneeSelect
            participants={participants}
            aria-label="Assignee"
            {...register("assignee_id")}
          />
          <input
            type="date"
            aria-label="Due date"
            className={INPUT_CLASS}
            {...register("due_date")}
          />
          {edit ? (
            <>
              <Button type="button" variant="ghost" size="lg" onClick={edit.onCancel}>
                Cancel
              </Button>
              <Button type="submit" size="lg">
                {isPending ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <Button type="submit" size="lg">
              <Plus aria-hidden="true" />
              Add
            </Button>
          )}
        </div>
        {errors.text && (
          <p id={fieldErrorId(textId)} role="alert" className="text-xs text-danger-fg">
            {errors.text.message}
          </p>
        )}
      </fieldset>
    </form>
  );
}
