import { describe, expect, it } from "vitest";
import { parseMeetingIdParam } from "@/shared/constants/routes";

describe("parseMeetingIdParam", () => {
  it("parses positive integers", () => {
    expect(parseMeetingIdParam("12")).toBe(12);
  });

  it.each(["", "0", "-1", "1.5", "abc", "12abc", "99999999999999999999"])("rejects %s", (value) => {
    expect(parseMeetingIdParam(value)).toBeNull();
  });
});
