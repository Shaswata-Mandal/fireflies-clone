import { describe, expect, it } from "vitest";
import type { ActionItem } from "@/modules/action-items/types";
import { groupActionItems, isOverdue, toLocalIsoDate } from "@/modules/action-items/utils";

function item(overrides: Partial<ActionItem> & { id: number }): ActionItem {
  return {
    meeting_id: 1,
    text: `Item ${overrides.id}`,
    assignee: null,
    due_date: null,
    is_completed: false,
    completed_at: null,
    source_segment_id: null,
    source_start_ms: null,
    position: overrides.id,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// groupActionItems
// ---------------------------------------------------------------------------

describe("groupActionItems", () => {
  it("splits open and completed, keeping the original order in each group", () => {
    const items = [
      item({ id: 1 }),
      item({ id: 2, is_completed: true }),
      item({ id: 3 }),
      item({ id: 4, is_completed: true }),
    ];

    const { open, completed } = groupActionItems(items);

    expect(open.map((entry) => entry.id)).toEqual([1, 3]);
    expect(completed.map((entry) => entry.id)).toEqual([2, 4]);
  });

  it("puts everything in open when nothing is completed", () => {
    const { open, completed } = groupActionItems([item({ id: 1 }), item({ id: 2 })]);
    expect(open).toHaveLength(2);
    expect(completed).toEqual([]);
  });

  it("returns two empty groups for an empty list", () => {
    expect(groupActionItems([])).toEqual({ open: [], completed: [] });
  });
});

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------

describe("isOverdue", () => {
  // Local time, mid-afternoon, so the local date is unambiguous in any time zone.
  const now = new Date(2026, 9, 7, 15, 0); // 7 Oct 2026

  it("is true for an open item due before today", () => {
    expect(isOverdue({ is_completed: false, due_date: "2026-10-06" }, now)).toBe(true);
  });

  it("is false when due today (still time left)", () => {
    expect(isOverdue({ is_completed: false, due_date: "2026-10-07" }, now)).toBe(false);
  });

  it("is false when due in the future", () => {
    expect(isOverdue({ is_completed: false, due_date: "2026-10-08" }, now)).toBe(false);
  });

  it("is never true for a completed item", () => {
    expect(isOverdue({ is_completed: true, due_date: "2020-01-01" }, now)).toBe(false);
  });

  it("is false without a due date", () => {
    expect(isOverdue({ is_completed: false, due_date: null }, now)).toBe(false);
  });

  it("compares across months and years as dates, not numbers", () => {
    expect(isOverdue({ is_completed: false, due_date: "2025-12-31" }, now)).toBe(true);
    expect(isOverdue({ is_completed: false, due_date: "2026-11-01" }, now)).toBe(false);
  });
});

describe("toLocalIsoDate", () => {
  it("zero-pads month and day", () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });
});
