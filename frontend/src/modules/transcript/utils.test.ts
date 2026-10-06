import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "@/modules/transcript/types";
import {
  escapeRegExp,
  findActiveSegmentIndex,
  findMatches,
  groupSegmentsBySpeaker,
  splitHighlight,
} from "@/modules/transcript/utils";

function segment(overrides: Partial<TranscriptSegment> & { id: number }): TranscriptSegment {
  return {
    position: overrides.id,
    speaker_label: "Priya",
    participant_id: 1,
    start_ms: 0,
    end_ms: 0,
    text: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findActiveSegmentIndex
// ---------------------------------------------------------------------------

describe("findActiveSegmentIndex", () => {
  // Starts at 5s, 10s, 20s; a gap between 12s and 20s.
  const segments = [
    { start_ms: 5_000, end_ms: 9_000 },
    { start_ms: 10_000, end_ms: 12_000 },
    { start_ms: 20_000, end_ms: 25_000 },
  ];

  it("returns -1 for an empty list", () => {
    expect(findActiveSegmentIndex([], 1_000)).toBe(-1);
  });

  it("returns -1 before the first segment", () => {
    expect(findActiveSegmentIndex(segments, 0)).toBe(-1);
    expect(findActiveSegmentIndex(segments, 4_999)).toBe(-1);
  });

  it("activates a segment exactly on its start boundary", () => {
    expect(findActiveSegmentIndex(segments, 5_000)).toBe(0);
    expect(findActiveSegmentIndex(segments, 10_000)).toBe(1);
    expect(findActiveSegmentIndex(segments, 20_000)).toBe(2);
  });

  it("keeps the previous segment just before the next boundary", () => {
    expect(findActiveSegmentIndex(segments, 9_999)).toBe(0);
  });

  it("keeps the previous segment active in a silent gap", () => {
    expect(findActiveSegmentIndex(segments, 15_000)).toBe(1);
  });

  it("keeps the last segment active after the transcript ends", () => {
    expect(findActiveSegmentIndex(segments, 25_001)).toBe(2);
    expect(findActiveSegmentIndex(segments, 10_000_000)).toBe(2);
  });

  it("handles a single segment", () => {
    expect(findActiveSegmentIndex([{ start_ms: 0 }], 0)).toBe(0);
  });

  it("agrees with a linear scan on a long list", () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ start_ms: i * 3_000 }));
    for (const t of [0, 1, 2_999, 3_000, 750_000, 1_497_000, 2_000_000]) {
      const linear = many.findLastIndex((s) => s.start_ms <= t);
      expect(findActiveSegmentIndex(many, t)).toBe(linear);
    }
  });
});

// ---------------------------------------------------------------------------
// groupSegmentsBySpeaker
// ---------------------------------------------------------------------------

describe("groupSegmentsBySpeaker", () => {
  it("returns no blocks for an empty transcript", () => {
    expect(groupSegmentsBySpeaker([])).toEqual([]);
  });

  it("groups consecutive segments by the same speaker and keeps global indexes", () => {
    const blocks = groupSegmentsBySpeaker([
      segment({ id: 10, start_ms: 0 }),
      segment({ id: 11, start_ms: 2_000 }),
      segment({ id: 12, speaker_label: "Rahul", participant_id: 2, start_ms: 4_000 }),
      segment({ id: 13, start_ms: 6_000 }),
    ]);

    expect(blocks).toEqual([
      { key: 10, speaker_label: "Priya", participant_id: 1, start_ms: 0, segmentIndexes: [0, 1] },
      { key: 12, speaker_label: "Rahul", participant_id: 2, start_ms: 4_000, segmentIndexes: [2] },
      { key: 13, speaker_label: "Priya", participant_id: 1, start_ms: 6_000, segmentIndexes: [3] },
    ]);
  });

  it("splits blocks when the label matches but the participant differs", () => {
    const blocks = groupSegmentsBySpeaker([
      segment({ id: 1, speaker_label: "Alex", participant_id: 3 }),
      segment({ id: 2, speaker_label: "Alex", participant_id: null }),
    ]);
    expect(blocks).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// escapeRegExp / findMatches
// ---------------------------------------------------------------------------

describe("escapeRegExp", () => {
  it("escapes every RegExp special character", () => {
    const special = ".*+?^${}()|[]\\";
    expect(new RegExp(escapeRegExp(special)).test(special)).toBe(true);
  });
});

describe("findMatches", () => {
  const texts = (...values: string[]) => values.map((text) => ({ text }));

  it("returns nothing for an empty or blank query", () => {
    expect(findMatches(texts("anything"), "")).toEqual([]);
    expect(findMatches(texts("anything"), "   ")).toEqual([]);
  });

  it("returns nothing for an empty transcript", () => {
    expect(findMatches([], "budget")).toEqual([]);
  });

  it("is case-insensitive and keeps document order across segments", () => {
    expect(findMatches(texts("Budget first", "the BUDGET and budget"), "budget")).toEqual([
      { segmentIndex: 0, start: 0, end: 6 },
      { segmentIndex: 1, start: 4, end: 10 },
      { segmentIndex: 1, start: 15, end: 21 },
    ]);
  });

  it("treats ( literally instead of throwing an invalid RegExp error", () => {
    expect(findMatches(texts("call f(x) now"), "f(")).toEqual([
      { segmentIndex: 0, start: 5, end: 7 },
    ]);
  });

  it("treats .* literally instead of matching everything", () => {
    expect(findMatches(texts("no wildcard here"), ".*")).toEqual([]);
    expect(findMatches(texts("glob a.* b"), ".*")).toEqual([{ segmentIndex: 0, start: 6, end: 8 }]);
  });

  it("treats brackets and $ literally", () => {
    expect(findMatches(texts("cost [a] $5"), "[a]")).toEqual([
      { segmentIndex: 0, start: 5, end: 8 },
    ]);
    expect(findMatches(texts("cost [a] $5"), "$5")).toEqual([
      { segmentIndex: 0, start: 9, end: 11 },
    ]);
  });

  it("does not return overlapping matches", () => {
    expect(findMatches(texts("aaaa"), "aa")).toEqual([
      { segmentIndex: 0, start: 0, end: 2 },
      { segmentIndex: 0, start: 2, end: 4 },
    ]);
    expect(findMatches(texts("aaa"), "aa")).toHaveLength(1);
  });

  it("trims surrounding whitespace from the query", () => {
    expect(findMatches(texts("ship it"), "  ship ")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// splitHighlight
// ---------------------------------------------------------------------------

describe("splitHighlight", () => {
  it("returns the whole text as one plain part when there are no ranges", () => {
    expect(splitHighlight("hello", [])).toEqual([{ text: "hello", kind: "plain" }]);
  });

  it("returns no parts for empty text", () => {
    expect(splitHighlight("", [])).toEqual([]);
  });

  it("splits around ranges and marks the current one", () => {
    const ranges = [
      { start: 4, end: 10 },
      { start: 15, end: 21 },
    ];
    expect(splitHighlight("the BUDGET and budget.", ranges, 15)).toEqual([
      { text: "the ", kind: "plain" },
      { text: "BUDGET", kind: "match" },
      { text: " and ", kind: "plain" },
      { text: "budget", kind: "current" },
      { text: ".", kind: "plain" },
    ]);
  });

  it("handles matches at both edges and adjacent matches", () => {
    expect(
      splitHighlight("aaaa", [
        { start: 0, end: 2 },
        { start: 2, end: 4 },
      ]),
    ).toEqual([
      { text: "aa", kind: "match" },
      { text: "aa", kind: "match" },
    ]);
  });

  it("round-trips: joining the parts gives back the original text", () => {
    const text = "We need to (re)check f(x).* today";
    const ranges = findMatches([{ text }], "(").map(({ start, end }) => ({ start, end }));
    expect(
      splitHighlight(text, ranges)
        .map((part) => part.text)
        .join(""),
    ).toBe(text);
  });
});
