import { describe, expect, it } from "vitest";

import { resolveApiUrl } from "./env";

describe("resolveApiUrl", () => {
  it("uses the configured value", () => {
    expect(resolveApiUrl("https://api.example.com/api/v1", "production")).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it("falls back to localhost outside production", () => {
    expect(resolveApiUrl(undefined, "development")).toBe("http://localhost:8000/api/v1");
    expect(resolveApiUrl("", "test")).toBe("http://localhost:8000/api/v1");
  });

  it("throws a clear error in production when missing", () => {
    expect(() => resolveApiUrl(undefined, "production")).toThrow(/NEXT_PUBLIC_API_URL is not set/);
    expect(() => resolveApiUrl("", "production")).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
