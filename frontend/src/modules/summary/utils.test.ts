import { describe, expect, it } from "vitest";
import { findActiveChapterIndex } from "@/modules/summary/utils";

describe("findActiveChapterIndex", () => {
  // Chapters starting at 0:10, 1:00 and 2:30.
  const chapters = [{ start_ms: 10_000 }, { start_ms: 60_000 }, { start_ms: 150_000 }];

  it("is -1 before the first chapter starts", () => {
    expect(findActiveChapterIndex(chapters, 0)).toBe(-1);
    expect(findActiveChapterIndex(chapters, 9_999)).toBe(-1);
  });

  it("switches exactly on a chapter boundary", () => {
    expect(findActiveChapterIndex(chapters, 10_000)).toBe(0);
    expect(findActiveChapterIndex(chapters, 59_999)).toBe(0);
    expect(findActiveChapterIndex(chapters, 60_000)).toBe(1);
  });

  it("stays on the last chapter after it starts", () => {
    expect(findActiveChapterIndex(chapters, 150_000)).toBe(2);
    expect(findActiveChapterIndex(chapters, 10_000_000)).toBe(2);
  });

  it("is -1 for an empty outline", () => {
    expect(findActiveChapterIndex([], 5_000)).toBe(-1);
  });
});
