import { describe, expect, it } from "vitest";
import { ACTION_ITEM_TEXT_MAX_LENGTH } from "@/modules/action-items/constants";
import { actionItemFormSchema, EMPTY_ACTION_ITEM_FORM } from "@/modules/action-items/schema";

function parse(overrides: Partial<typeof EMPTY_ACTION_ITEM_FORM>) {
  return actionItemFormSchema.safeParse({ ...EMPTY_ACTION_ITEM_FORM, ...overrides });
}

describe("actionItemFormSchema", () => {
  it("trims the text and maps empty assignee / due date to null", () => {
    const result = parse({ text: "  Send the budget  " });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ text: "Send the budget", assignee_id: null, due_date: null });
  });

  it("rejects empty and whitespace-only text", () => {
    expect(parse({ text: "" }).success).toBe(false);
    expect(parse({ text: "   " }).success).toBe(false);
  });

  it("accepts exactly the max length and rejects one more", () => {
    expect(parse({ text: "x".repeat(ACTION_ITEM_TEXT_MAX_LENGTH) }).success).toBe(true);
    expect(parse({ text: "x".repeat(ACTION_ITEM_TEXT_MAX_LENGTH + 1) }).success).toBe(false);
  });

  it("checks the length after trimming", () => {
    const padded = `  ${"x".repeat(ACTION_ITEM_TEXT_MAX_LENGTH)}  `;
    expect(parse({ text: padded }).success).toBe(true);
  });

  it("turns the selected assignee into a numeric id", () => {
    expect(parse({ text: "a", assignee_id: "7" }).data?.assignee_id).toBe(7);
  });

  it("keeps a valid due date and rejects a malformed one", () => {
    expect(parse({ text: "a", due_date: "2026-10-10" }).data?.due_date).toBe("2026-10-10");
    expect(parse({ text: "a", due_date: "10/10/2026" }).success).toBe(false);
  });

  it("puts the text error on the text field", () => {
    const result = parse({ text: " " });
    expect(result.error?.issues[0]?.path).toEqual(["text"]);
  });
});
