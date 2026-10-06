// Meetings library state <-> URL search params. Pure functions (no React, no Next), so the rules for
// what a valid URL looks like live in one place and can be unit-tested.

import {
  DEFAULT_SORT,
  MEETING_VIEWS,
  MEETINGS_PAGE_SIZE,
  SORT_OPTIONS,
  type MeetingView,
} from "@/modules/meetings/constants";
import type { MeetingSort, MeetingsQuery } from "@/modules/meetings/types";

export interface MeetingsUrlState {
  view: MeetingView;
  q: string;
  participantId: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  sort: MeetingSort;
  page: number;
}

export const DEFAULT_MEETINGS_STATE: MeetingsUrlState = {
  view: MEETING_VIEWS.MINE,
  q: "",
  participantId: null,
  dateFrom: null,
  dateTo: null,
  sort: DEFAULT_SORT,
  page: 1,
};

const PARAM = {
  VIEW: "view",
  Q: "q",
  PARTICIPANT: "participant_id",
  DATE_FROM: "date_from",
  DATE_TO: "date_to",
  SORT: "sort",
  PAGE: "page",
} as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SORTS = new Set<string>(SORT_OPTIONS.map((option) => option.value));

// ── Parsing: anything malformed falls back to the default instead of producing a 422 ──────────

function parsePositiveInt(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= 1 && Number.isSafeInteger(value) ? value : null;
}

function parseDate(raw: string | null): string | null {
  if (raw === null || !DATE_ONLY.test(raw)) return null;
  // Rejects impossible dates like 2026-02-31, which the regex alone lets through.
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? raw : null;
}

function isMeetingSort(raw: string | null): raw is MeetingSort {
  return raw !== null && VALID_SORTS.has(raw);
}

export function parseMeetingsParams(params: URLSearchParams): MeetingsUrlState {
  const sort = params.get(PARAM.SORT);
  return {
    view: params.get(PARAM.VIEW) === MEETING_VIEWS.ALL ? MEETING_VIEWS.ALL : MEETING_VIEWS.MINE,
    q: params.get(PARAM.Q)?.trim() ?? "",
    participantId: parsePositiveInt(params.get(PARAM.PARTICIPANT)),
    dateFrom: parseDate(params.get(PARAM.DATE_FROM)),
    dateTo: parseDate(params.get(PARAM.DATE_TO)),
    sort: isMeetingSort(sort) ? sort : DEFAULT_SORT,
    page: parsePositiveInt(params.get(PARAM.PAGE)) ?? 1,
  };
}

// ── Serializing: defaults are omitted so the plain view is just `/meetings` ─────────────────────

export function serializeMeetingsParams(state: MeetingsUrlState): string {
  const params = new URLSearchParams();
  if (state.view !== DEFAULT_MEETINGS_STATE.view) params.set(PARAM.VIEW, state.view);
  if (state.q.trim()) params.set(PARAM.Q, state.q.trim());
  if (state.participantId !== null) params.set(PARAM.PARTICIPANT, String(state.participantId));
  if (state.dateFrom) params.set(PARAM.DATE_FROM, state.dateFrom);
  if (state.dateTo) params.set(PARAM.DATE_TO, state.dateTo);
  if (state.sort !== DEFAULT_SORT) params.set(PARAM.SORT, state.sort);
  if (state.page > 1) params.set(PARAM.PAGE, String(state.page));
  return params.toString();
}

// ── Derived helpers ─────────────────────────────────────────────────────────────────────────────

/** Filters that narrow the result set (sort, page and view don't). */
export function hasActiveFilters(state: MeetingsUrlState): boolean {
  return (
    Boolean(state.q) || state.participantId !== null || Boolean(state.dateFrom || state.dateTo)
  );
}

/** Clears search + filters, keeps the view and sort the user chose. */
export function clearFilters(state: MeetingsUrlState): MeetingsUrlState {
  return { ...state, q: "", participantId: null, dateFrom: null, dateTo: null, page: 1 };
}

/** URL state → `GET /meetings` params. `view` isn't sent: both channels show the same meetings. */
export function toMeetingsQuery(state: MeetingsUrlState): MeetingsQuery {
  return {
    q: state.q || undefined,
    participant_id: state.participantId ?? undefined,
    date_from: state.dateFrom ?? undefined,
    date_to: state.dateTo ?? undefined,
    sort: state.sort,
    page: state.page,
    limit: MEETINGS_PAGE_SIZE,
  };
}
