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
  assignee_id: z.string().transform((value) => (value === UNASSIGNED_VALUE ? null : Number(value))),
  due_date: z
    .union([z.literal(""), z.iso.date("Enter a valid date")])
    .transform((value) => (value === "" ? null : value)),
});

export type ActionItemFormInput = z.input<typeof actionItemFormSchema>;
/** Same shape as `ActionItemCreate`; sent as-is to PATCH too, so `null` clears assignee / due date. */
export type ActionItemFormOutput = z.output<typeof actionItemFormSchema>;

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
