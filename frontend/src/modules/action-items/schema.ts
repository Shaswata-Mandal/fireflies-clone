/**
 * zod schema for the add / edit action-item form.
 *
 * WHAT: Validates the text, assignee and due date, and TRANSFORMS them into the API payload.
 * LAYER: Module schema (client-side validation; the backend validates again).
 * CALLED BY: `ActionItemForm` through react-hook-form's `zodResolver`.
 * CALLS: zod, `constants.ts`.
 * MERN EQUIVALENT: a Yup schema with `.transform()`.
 * INTERVIEW: input type vs output type. HTML controls give strings ("" for nothing); the API
 * wants `null` or a number. `.transform()` converts on validation, so the form code never does
 * string juggling. `z.input<>` is what the form holds, `z.output<>` is what `onSubmit` receives.
 */

import { z } from "zod";
import { ACTION_ITEM_TEXT_MAX_LENGTH, UNASSIGNED_VALUE } from "@/modules/action-items/constants";
import type { ActionItem } from "@/modules/action-items/types";

/**
 * Add / edit form. Inputs are strings (what <input> and <select> give us); the output is the API
 * payload shape, so `""` becomes `null` and the text is trimmed before the length check, exactly like
 * the backend's `StringConstraints(strip_whitespace=True, min_length=1, max_length=500)`.
 */
export const actionItemFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Enter the action item")
    .max(ACTION_ITEM_TEXT_MAX_LENGTH, `Keep it under ${ACTION_ITEM_TEXT_MAX_LENGTH} characters`),
  // A <select> value is always a string: "" -> null, "7" -> 7.
  assignee_id: z.string().transform((value) => (value === UNASSIGNED_VALUE ? null : Number(value))),
  // Either "" (no date) or a real YYYY-MM-DD string; "" is then turned into null.
  due_date: z
    .union([z.literal(""), z.iso.date("Enter a valid date")])
    .transform((value) => (value === "" ? null : value)),
});

export type ActionItemFormInput = z.input<typeof actionItemFormSchema>;
/** Same shape as `ActionItemCreate`; sent as-is to PATCH too, so `null` clears assignee / due date. */
export type ActionItemFormOutput = z.output<typeof actionItemFormSchema>;

/** Blank form values (also used to reset the form after a successful add). */
export const EMPTY_ACTION_ITEM_FORM: ActionItemFormInput = {
  text: "",
  assignee_id: UNASSIGNED_VALUE,
  due_date: "",
};

/** Form values for editing an existing item. */
export function toActionItemFormInput(item: ActionItem): ActionItemFormInput {
  return {
    text: item.text,
    assignee_id: item.assignee ? String(item.assignee.id) : UNASSIGNED_VALUE,
    due_date: item.due_date ?? "",
  };
}
