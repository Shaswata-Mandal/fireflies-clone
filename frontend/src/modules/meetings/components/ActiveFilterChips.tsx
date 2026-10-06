"use client";

import { X } from "lucide-react";
import { useParticipants } from "@/modules/meetings/hooks";
import type { MeetingsUrlState } from "@/modules/meetings/url-state";
import { formatDateOnly } from "@/shared/utils/format-date";

interface ActiveFilterChipsProps {
  state: MeetingsUrlState;
  onChange: (patch: Partial<MeetingsUrlState>) => void;
  onClearAll: () => void;
}

interface Chip {
  key: string;
  label: string;
  patch: Partial<MeetingsUrlState>;
}

/** One removable chip per active filter, plus "Clear all". Renders nothing when no filter is set. */
export function ActiveFilterChips({ state, onChange, onClearAll }: ActiveFilterChipsProps) {
  // Shares the filter popover's cache entry, so this is normally not a new request.
  const { data: participants } = useParticipants();

  const chips: Chip[] = [];
  if (state.q) chips.push({ key: "q", label: `Search: “${state.q}”`, patch: { q: "" } });
  if (state.participantId !== null) {
    const person = participants?.find((p) => p.id === state.participantId);
    chips.push({
      key: "participant",
      label: `Participant: ${person?.name ?? `#${state.participantId}`}`,
      patch: { participantId: null },
    });
  }
  if (state.dateFrom) {
    chips.push({
      key: "from",
      label: `From ${formatDateOnly(state.dateFrom)}`,
      patch: { dateFrom: null },
    });
  }
  if (state.dateTo) {
    chips.push({ key: "to", label: `To ${formatDateOnly(state.dateTo)}`, patch: { dateTo: null } });
  }

  if (chips.length === 0) return null;

  return (
    <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li
          key={chip.key}
          className="flex h-7 items-center gap-1 rounded-full border border-focus bg-primary-subtle pr-1 pl-3 text-xs text-primary-fg"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onChange(chip.patch)}
            aria-label={`Remove filter ${chip.label}`}
            className="rounded-full p-0.5 hover:bg-primary-muted"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={onClearAll}
          className="px-1 text-xs text-link hover:underline"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
