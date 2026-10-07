import { describe, expect, it } from "vitest";
import { CREATE_TABS, MAX_UPLOAD_BYTES, TITLE_MAX_LENGTH } from "@/modules/meetings/constants";
import {
  createMeetingSchema,
  editMeetingSchema,
  emptyCreateMeetingValues,
  type CreateMeetingFormValues,
} from "@/modules/meetings/schemas";

function parse(overrides: Partial<CreateMeetingFormValues>) {
  return createMeetingSchema.safeParse({
    ...emptyCreateMeetingValues(CREATE_TABS.MANUAL),
    title: "Design review",
    ...overrides,
  });
}

function errorPaths(result: ReturnType<typeof parse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("createMeetingSchema: common fields", () => {
  it("accepts the manual tab with just a title and date", () => {
    expect(parse({}).success).toBe(true);
  });

  it("trims the title and rejects empty or whitespace-only titles", () => {
    expect(parse({ title: "  Hello  " }).data?.title).toBe("Hello");
    expect(errorPaths(parse({ title: "" }))).toContain("title");
    expect(errorPaths(parse({ title: "   " }))).toContain("title");
  });

  it("accepts exactly 200 characters and rejects 201", () => {
    expect(parse({ title: "x".repeat(TITLE_MAX_LENGTH) }).success).toBe(true);
    expect(errorPaths(parse({ title: "x".repeat(TITLE_MAX_LENGTH + 1) }))).toContain("title");
  });

  it("rejects an empty or invalid date", () => {
    expect(errorPaths(parse({ meeting_date: "" }))).toContain("meeting_date");
    expect(errorPaths(parse({ meeting_date: "not a date" }))).toContain("meeting_date");
  });
});

describe("createMeetingSchema: tab-specific requirements", () => {
  it("upload tab requires a file", () => {
    expect(errorPaths(parse({ tab: CREATE_TABS.UPLOAD, file: null }))).toContain("file");
  });

  it("upload tab validates the file's extension and size", () => {
    const wrongType = new File(["x"], "notes.pdf");
    expect(errorPaths(parse({ tab: CREATE_TABS.UPLOAD, file: wrongType }))).toContain("file");

    const tooBig = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.txt");
    expect(errorPaths(parse({ tab: CREATE_TABS.UPLOAD, file: tooBig }))).toContain("file");

    const ok = new File(["[00:00:01] A: hi"], "ok.txt");
    expect(parse({ tab: CREATE_TABS.UPLOAD, file: ok }).success).toBe(true);
  });

  it("paste tab requires non-blank transcript text", () => {
    expect(errorPaths(parse({ tab: CREATE_TABS.PASTE, transcript_text: "   " }))).toContain(
      "transcript_text",
    );
    expect(parse({ tab: CREATE_TABS.PASTE, transcript_text: "[00:00:01] A: hi" }).success).toBe(
      true,
    );
  });

  it("ignores the other tabs' fields", () => {
    const stale = new File(["x"], "notes.pdf");
    const result = parse({ tab: CREATE_TABS.MANUAL, file: stale, transcript_text: "" });
    expect(result.success).toBe(true);
  });
});

describe("editMeetingSchema", () => {
  it("validates title and date, with no transcript fields", () => {
    const base = { title: "T", meeting_date: "2026-10-01T09:30", participants: [] };
    expect(editMeetingSchema.safeParse(base).success).toBe(true);
    expect(editMeetingSchema.safeParse({ ...base, title: " " }).success).toBe(false);
  });
});
