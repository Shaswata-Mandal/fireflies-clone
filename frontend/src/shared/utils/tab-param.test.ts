import { describe, expect, it } from "vitest";
import { parseTabParam } from "@/shared/utils/tab-param";

const IDS = ["a", "b"] as const;

describe("parseTabParam", () => {
  it("returns a known id", () => {
    expect(parseTabParam("b", IDS, "a")).toBe("b");
  });

  it.each([null, "", "c"])("falls back for %s", (value) => {
    expect(parseTabParam(value, IDS, "a")).toBe("a");
  });
});
