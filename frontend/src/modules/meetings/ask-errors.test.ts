import { describe, expect, it } from "vitest";
import { describeAskError } from "@/modules/meetings/ask-errors";
import { ApiError } from "@/shared/lib/api-error";

const apiError = (status: number, code: string, details?: unknown) =>
  new ApiError("server message", { status, code, details });

describe("describeAskError", () => {
  it("explains a missing key without offering a retry", () => {
    const view = describeAskError(apiError(503, "LLM_NOT_CONFIGURED"));
    expect(view.message).toMatch(/set up/);
    expect(view.canRetry).toBe(false);
  });

  it("says how many seconds to wait on a rate limit", () => {
    const view = describeAskError(apiError(429, "LLM_RATE_LIMITED", { retry_after: 42 }));
    expect(view.message).toContain("Try again in 42 seconds");
    expect(view.canRetry).toBe(false);
  });

  it.each([undefined, null, {}, { retry_after: "soon" }, { retry_after: -3 }])(
    "falls back to 60 seconds when details are %j",
    (details) => {
      const view = describeAskError(apiError(429, "LLM_RATE_LIMITED", details));
      expect(view.message).toContain("Try again in 60 seconds");
    },
  );

  it("uses the singular for one second", () => {
    const view = describeAskError(apiError(429, "LLM_RATE_LIMITED", { retry_after: 1 }));
    expect(view.message).toContain("1 second.");
  });

  it.each([apiError(502, "LLM_ERROR"), apiError(500, "INTERNAL_ERROR"), new Error("boom")])(
    "offers a retry for any other failure",
    (error) => {
      expect(describeAskError(error).canRetry).toBe(true);
    },
  );
});
