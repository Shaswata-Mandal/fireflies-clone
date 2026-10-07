import { describe, expect, it } from "vitest";
import { getSmartFilters, getSpeakerTalktime } from "@/modules/meetings/smart-search";
import type { TranscriptSegment } from "@/modules/transcript/types";

function segment(speaker: string, text: string, start_ms = 0, end_ms = 1000): TranscriptSegment {
  return {
    id: start_ms,
    position: 0,
    speaker_label: speaker,
    participant_id: null,
    start_ms,
    end_ms,
    text,
  };
}

const countOf = (filters: ReturnType<typeof getSmartFilters>, id: string) =>
  filters.find((filter) => filter.id === id)?.count;

describe("getSmartFilters", () => {
  const segments = [
    segment("A", "Can we ship on Friday?"),
    segment("B", "The budget is $5k, up 20% on last quarter."),
    segment("A", "Sounds good."),
  ];
  const filters = getSmartFilters({ segments, taskCount: 4, topicCount: 7 });

  it("counts segments per pattern", () => {
    expect(countOf(filters, "questions")).toBe(1);
    expect(countOf(filters, "pricing")).toBe(1);
    expect(countOf(filters, "metrics")).toBe(1);
    expect(countOf(filters, "dateTime")).toBe(1);
  });

  it("passes tasks and topics through", () => {
    expect(countOf(filters, "tasks")).toBe(4);
    expect(countOf(filters, "keyTopics")).toBe(7);
  });

  it("returns six zeros for an empty transcript", () => {
    const empty = getSmartFilters({ segments: [], taskCount: 0, topicCount: 0 });
    expect(empty).toHaveLength(6);
    expect(empty.every((filter) => filter.count === 0)).toBe(true);
  });

  it("does not treat every word 'may' or a lone digit as a hit", () => {
    const result = getSmartFilters({
      segments: [segment("A", "We have 3 options.")],
      taskCount: 0,
      topicCount: 0,
    });
    expect(countOf(result, "metrics")).toBe(0);
  });
});

describe("getSpeakerTalktime", () => {
  it("shares speaking time by speaker, biggest first", () => {
    const result = getSpeakerTalktime([
      segment("A", "x", 0, 1000),
      segment("B", "y", 1000, 4000),
      segment("A", "z", 4000, 5000),
    ]);
    expect(result).toEqual([
      { speaker: "B", percent: 60 },
      { speaker: "A", percent: 40 },
    ]);
  });

  it("is empty when no time was spoken", () => {
    expect(getSpeakerTalktime([])).toEqual([]);
    expect(getSpeakerTalktime([segment("A", "x", 5, 5)])).toEqual([]);
  });
});
