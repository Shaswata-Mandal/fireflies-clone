import { describe, expect, it } from "vitest";
import { parseThemePreference, resolveTheme } from "@/shared/utils/theme";

describe("parseThemePreference", () => {
  it.each(["light", "dark", "system"] as const)("keeps %s", (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  it.each([null, "", "blue"])("falls back to dark for %s", (value) => {
    expect(parseThemePreference(value)).toBe("dark");
  });
});

describe("resolveTheme", () => {
  it("returns explicit choices unchanged", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system when asked", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
