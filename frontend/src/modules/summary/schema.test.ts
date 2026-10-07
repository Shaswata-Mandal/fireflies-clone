import { describe, expect, it } from "vitest";
import {
  SUMMARY_KEYWORD_MAX_LENGTH,
  SUMMARY_MAX_KEYWORDS,
  SUMMARY_OVERVIEW_MAX_LENGTH,
} from "@/modules/summary/constants";
import { summaryFormSchema, toSummaryFormInput } from "@/modules/summary/schema";

const VALID = { overview: "We agreed on the launch.", bullet_points: "", keywords: "" };

describe("summaryFormSchema", () => {
  it("splits bullets by line and keywords by comma, dropping blanks", () => {
    const result = summaryFormSchema.parse({
      overview: "  Overview  ",
      bullet_points: "First\n\n  Second  \n",
      keywords: "budget, , launch ,",
    });

    expect(result).toEqual({
      overview: "Overview",
      bullet_points: ["First", "Second"],
      keywords: ["budget", "launch"],
    });
  });

  it("requires an overview", () => {
    expect(summaryFormSchema.safeParse({ ...VALID, overview: "   " }).success).toBe(false);
  });

  it("caps the overview length", () => {
    const overview = "x".repeat(SUMMARY_OVERVIEW_MAX_LENGTH + 1);
    expect(summaryFormSchema.safeParse({ ...VALID, overview }).success).toBe(false);
  });

  it("caps keyword length and count", () => {
    const longKeyword = "x".repeat(SUMMARY_KEYWORD_MAX_LENGTH + 1);
    const tooMany = Array.from({ length: SUMMARY_MAX_KEYWORDS + 1 }, (_, i) => `k${i}`).join(",");

    expect(summaryFormSchema.safeParse({ ...VALID, keywords: longKeyword }).success).toBe(false);
    expect(summaryFormSchema.safeParse({ ...VALID, keywords: tooMany }).success).toBe(false);
  });

  it("round-trips an existing summary through the form strings", () => {
    const summary = {
      overview: "O",
      bullet_points: ["a", "b"],
      keywords: ["x", "y"],
      generated_by: "seed" as const,
    };

    const parsed = summaryFormSchema.parse(toSummaryFormInput(summary));

    expect(parsed).toEqual({ overview: "O", bullet_points: ["a", "b"], keywords: ["x", "y"] });
  });
});

describe("summaryFormSchema error paths", () => {
  it("reports list errors on the field, not on an index", () => {
    const result = summaryFormSchema.safeParse({
      ...VALID,
      keywords: "x".repeat(SUMMARY_KEYWORD_MAX_LENGTH + 1),
    });
    expect(result.error?.issues[0]?.path).toEqual(["keywords"]);
  });
});
