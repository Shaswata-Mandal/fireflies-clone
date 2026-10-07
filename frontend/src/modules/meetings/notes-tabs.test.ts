import { describe, expect, it } from "vitest";
import { DEFAULT_NOTES_TAB, NOTES_TABS, parseNotesTab } from "@/modules/meetings/notes-tabs";

describe("parseNotesTab", () => {
  it("accepts every known tab id", () => {
    for (const id of Object.values(NOTES_TABS)) expect(parseNotesTab(id)).toBe(id);
  });

  it("falls back to the default for missing or unknown values", () => {
    expect(parseNotesTab(null)).toBe(DEFAULT_NOTES_TAB);
    expect(parseNotesTab("")).toBe(DEFAULT_NOTES_TAB);
    expect(parseNotesTab("Summary")).toBe(DEFAULT_NOTES_TAB);
  });
});
