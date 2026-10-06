import { describe, expect, it } from "vitest";
import { formatDuration, formatTimestamp } from "@/shared/utils/format-time";

describe("formatTimestamp", () => {
  it.each([
    [0, "00:00"],
    [999, "00:00"],
    [8_000, "00:08"],
    [65_500, "01:05"],
    [934_300, "15:34"],
    [3_599_999, "59:59"],
  ])("formats %d ms under an hour as mm:ss → %s", (ms, expected) => {
    expect(formatTimestamp(ms)).toBe(expected);
  });

  it.each([
    [3_600_000, "1:00:00"],
    [3_909_000, "1:05:09"],
    [36_000_000, "10:00:00"],
  ])("formats %d ms from one hour as h:mm:ss → %s", (ms, expected) => {
    expect(formatTimestamp(ms)).toBe(expected);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("treats invalid input %s as 00:00", (ms) => {
    expect(formatTimestamp(ms)).toBe("00:00");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [45_000, "45 sec"],
    [120_000, "2 min"],
    [3_900_000, "1h 5m"],
    [7_200_000, "2h"],
  ])("formats %d ms → %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});
