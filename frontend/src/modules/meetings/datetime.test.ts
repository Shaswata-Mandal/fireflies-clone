import { describe, expect, it } from "vitest";
import { isoToLocalInput, localInputToIso } from "@/modules/meetings/datetime";

describe("datetime-local conversion", () => {
  it("round-trips through UTC ISO regardless of the machine's timezone", () => {
    const local = "2026-10-01T09:30";
    const iso = localInputToIso(local);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    expect(isoToLocalInput(iso as string)).toBe(local);
  });

  it("returns null for empty or invalid input", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("garbage")).toBeNull();
  });
});
