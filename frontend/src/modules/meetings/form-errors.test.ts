import { describe, expect, it } from "vitest";
import { mapCreateError } from "@/modules/meetings/form-errors";
import { ApiError } from "@/shared/lib/api-error";

function apiError(code: string, message: string, details: unknown = null, status = 400) {
  return new ApiError(message, { status, code, details });
}

describe("mapCreateError", () => {
  it("puts file problems on the file field", () => {
    expect(mapCreateError(apiError("UNSUPPORTED_FILE", "Bad type"), true)).toEqual({
      field: "file",
      message: "Bad type",
    });
    expect(mapCreateError(apiError("FILE_TOO_LARGE", "Too big", null, 413), true)?.field).toBe(
      "file",
    );
  });

  it("puts parse errors on the file (upload) or the textarea (paste), with the line number", () => {
    const error = apiError("TRANSCRIPT_PARSE_ERROR", "Bad timestamp", { line: 7 });
    expect(mapCreateError(error, true)).toEqual({
      field: "file",
      message: "Bad timestamp (line 7)",
    });
    expect(mapCreateError(error, false)?.field).toBe("transcript_text");
  });

  it("does not repeat a location the backend message already has", () => {
    const error = apiError("TRANSCRIPT_PARSE_ERROR", "Line 7: bad timestamp", { line: 7 });
    expect(mapCreateError(error, false)?.message).toBe("Line 7: bad timestamp");
  });

  it("maps EMPTY_TRANSCRIPT by mode", () => {
    const error = apiError("EMPTY_TRANSCRIPT", "No segments");
    expect(mapCreateError(error, true)?.field).toBe("file");
    expect(mapCreateError(error, false)?.field).toBe("transcript_text");
  });

  it("places VALIDATION_ERROR on the named field, else the form banner", () => {
    const withField = apiError(
      "VALIDATION_ERROR",
      "Invalid",
      [{ loc: ["body", "title"], msg: "too long" }],
      422,
    );
    expect(mapCreateError(withField, false)).toEqual({ field: "title", message: "too long" });
    expect(mapCreateError(apiError("VALIDATION_ERROR", "Invalid", null, 422), false)).toEqual({
      field: "form",
      message: "Invalid",
    });
  });

  it("returns null for errors without a form meaning", () => {
    expect(mapCreateError(apiError("INTERNAL_ERROR", "Boom", null, 500), false)).toBeNull();
    expect(mapCreateError(new Error("x"), false)).toBeNull();
  });
});
