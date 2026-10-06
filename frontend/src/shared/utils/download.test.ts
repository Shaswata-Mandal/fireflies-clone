import { describe, expect, it } from "vitest";
import { filenameFromContentDisposition } from "@/shared/utils/download";

describe("filenameFromContentDisposition", () => {
  it("reads a quoted filename", () => {
    expect(filenameFromContentDisposition('attachment; filename="q4-roadmap.md"')).toBe(
      "q4-roadmap.md",
    );
  });

  it("reads an unquoted filename", () => {
    expect(filenameFromContentDisposition("attachment; filename=notes.txt")).toBe("notes.txt");
  });

  it.each([undefined, null, "", "attachment", 'attachment; filename=""'])(
    "returns null for %s",
    (header) => {
      expect(filenameFromContentDisposition(header)).toBeNull();
    },
  );
});
