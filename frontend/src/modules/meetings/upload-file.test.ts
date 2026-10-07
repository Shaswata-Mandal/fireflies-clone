import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/modules/meetings/constants";
import {
  fileExtension,
  formatFileSize,
  titleFromFilename,
  validateTranscriptFile,
} from "@/modules/meetings/upload-file";

describe("validateTranscriptFile", () => {
  it.each(["a.txt", "a.vtt", "a.json", "A.TXT", "my.notes.vtt"])("accepts %s", (name) => {
    expect(validateTranscriptFile({ name, size: 10 })).toBeNull();
  });

  it.each(["a.pdf", "a.docx", "a", ".txt", "a.txt.exe"])("rejects the extension of %s", (name) => {
    expect(validateTranscriptFile({ name, size: 10 })).toMatch(/\.txt, \.vtt and \.json/);
  });

  it("accepts exactly the size limit and rejects one byte more", () => {
    expect(validateTranscriptFile({ name: "a.txt", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateTranscriptFile({ name: "a.txt", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/limit/);
  });

  it("rejects empty files and empty names", () => {
    expect(validateTranscriptFile({ name: "a.txt", size: 0 })).toMatch(/empty/);
    expect(validateTranscriptFile({ name: "  ", size: 10 })).toMatch(/no name/);
  });
});

describe("titleFromFilename", () => {
  it("drops only the last extension", () => {
    expect(titleFromFilename("Q4 Roadmap.txt")).toBe("Q4 Roadmap");
    expect(titleFromFilename("sync.2026-10-01.vtt")).toBe("sync.2026-10-01");
  });

  it("keeps names without an extension and dotfiles", () => {
    expect(titleFromFilename("notes")).toBe("notes");
    expect(titleFromFilename(".txt")).toBe(".txt");
  });

  it("trims whitespace", () => {
    expect(titleFromFilename("  Standup .txt")).toBe("Standup");
  });
});

describe("fileExtension / formatFileSize", () => {
  it("lowercases the extension", () => {
    expect(fileExtension("A.JSON")).toBe("json");
    expect(fileExtension("noext")).toBe("");
  });

  it("formats sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(MAX_UPLOAD_BYTES)).toBe("2.0 MB");
  });
});
