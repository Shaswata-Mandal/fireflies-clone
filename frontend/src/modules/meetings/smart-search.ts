import type { TranscriptSegment } from "@/modules/transcript/types";

// Numbers for the "Smart Search" side panel (docs/reference/17). Everything is derived from data we
// already have: no extra API, no AI. Sentiment has no data source, so the panel doesn't count it.

const PERCENT = 100;

export type SmartFilterId =
  "questions" | "tasks" | "metrics" | "pricing" | "keyTopics" | "dateTime";

export interface SmartFilter {
  id: SmartFilterId;
  label: string;
  count: number;
  /** Text-color token; the dot uses `bg-current` so no hex lives in the component. */
  dotClass: string;
}

const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const WEEKDAYS = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";

// A segment "matches" when its text does; the counts are segments, not occurrences.
const PATTERNS = {
  questions: /\?/,
  metrics: /\d+(?:\.\d+)?\s?%|\b\d{2,}\b/,
  pricing: /\$|\b(?:price|prices|pricing|cost|costs|budget|revenue|discount|invoice)\b/i,
  dateTime: new RegExp(
    `\\b(?:${WEEKDAYS}|${MONTHS}|today|tomorrow|yesterday|next week|\\d{1,2}:\\d{2}|\\d{1,2}\\s?[ap]m)\\b`,
    "i",
  ),
} as const;

function countMatching(segments: readonly TranscriptSegment[], pattern: RegExp): number {
  return segments.filter((segment) => pattern.test(segment.text)).length;
}

interface SmartFilterInput {
  segments: readonly TranscriptSegment[];
  taskCount: number;
  topicCount: number;
}

/** The six AI-filter tiles, in screenshot order. */
export function getSmartFilters({
  segments,
  taskCount,
  topicCount,
}: SmartFilterInput): SmartFilter[] {
  return [
    {
      id: "questions",
      label: "Questions",
      count: countMatching(segments, PATTERNS.questions),
      dotClass: "text-danger-fg",
    },
    { id: "tasks", label: "Tasks", count: taskCount, dotClass: "text-warning" },
    {
      id: "metrics",
      label: "Metrics",
      count: countMatching(segments, PATTERNS.metrics),
      dotClass: "text-primary-fg",
    },
    {
      id: "pricing",
      label: "Pricing",
      count: countMatching(segments, PATTERNS.pricing),
      dotClass: "text-primary-fg",
    },
    { id: "keyTopics", label: "Key Topics", count: topicCount, dotClass: "text-primary-fg" },
    {
      id: "dateTime",
      label: "Date & Time",
      count: countMatching(segments, PATTERNS.dateTime),
      dotClass: "text-success",
    },
  ];
}

export interface Talktime {
  speaker: string;
  /** Whole percent of total speaking time; rounding can make the list sum to 99–101. */
  percent: number;
}

/** Share of speaking time per speaker, biggest first. Empty when nobody spoke. */
export function getSpeakerTalktime(segments: readonly TranscriptSegment[]): Talktime[] {
  const msBySpeaker = new Map<string, number>();
  for (const { speaker_label, start_ms, end_ms } of segments) {
    const spoken = Math.max(0, end_ms - start_ms);
    msBySpeaker.set(speaker_label, (msBySpeaker.get(speaker_label) ?? 0) + spoken);
  }
  const total = [...msBySpeaker.values()].reduce((sum, ms) => sum + ms, 0);
  if (total === 0) return [];

  return [...msBySpeaker]
    .map(([speaker, ms]) => ({ speaker, percent: Math.round((ms / total) * PERCENT) }))
    .sort((a, b) => b.percent - a.percent || a.speaker.localeCompare(b.speaker));
}
