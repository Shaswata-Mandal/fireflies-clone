/**
 * Participant filter list inside the filter popover.
 *
 * WHAT: A searchable, single-select list of people with loading, error and empty states.
 * LAYER: Module component (client).
 * CALLED BY: `MeetingsFilterPopover`.
 * CALLS: `useParticipants`, `UserAvatar`.
 * MERN EQUIVALENT: a searchable dropdown list fed by `GET /participants`.
 */

"use client";

import { Check, Search } from "lucide-react";
import { useState } from "react";
import { useParticipants } from "@/modules/meetings/hooks";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

interface FilterParticipantsPaneProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

// Number of placeholder rows while loading (`Array.from({ length })` below builds them, and the
// index is a safe React key because these rows never reorder).
const SKELETON_ROWS = 3;

/**
 * Searchable people list. Single-select because the API takes one `participant_id`; clicking the
 * selected person again clears it. The list is ≤ 100 rows, so search filters it client-side.
 */
export function FilterParticipantsPane({ selectedId, onSelect }: FilterParticipantsPaneProps) {
  const { data: participants, isPending, isError, refetch } = useParticipants();
  // Local UI state: what the user typed in the search box (not server state).
  const [query, setQuery] = useState("");

  // Derived on each render (no extra state): the filtered list.
  const needle = query.trim().toLowerCase();
  const visible = (participants ?? []).filter(
    (person) =>
      person.name.toLowerCase().includes(needle) ||
      (person.email ?? "").toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-strong bg-card px-2.5 focus-within:border-focus">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only">Search participants</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search participants"
            className="min-w-0 flex-1 bg-transparent text-sm text-default outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="button"
          disabled={selectedId === null}
          onClick={() => onSelect(null)}
          className="px-1 text-sm text-link hover:underline disabled:text-disabled disabled:no-underline"
        >
          Clear all
        </button>
      </div>

      {isPending && (
        <div className="flex flex-col gap-3 p-2" aria-busy="true" aria-label="Loading participants">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <p className="p-2 text-sm text-muted">
          Couldn&apos;t load participants.{" "}
          <button type="button" onClick={() => refetch()} className="text-link hover:underline">
            Retry
          </button>
        </p>
      )}

      {participants && visible.length === 0 && (
        <p className="p-2 text-sm text-muted">No participants match &ldquo;{query}&rdquo;.</p>
      )}

      {visible.length > 0 && (
        <ul className="flex max-h-72 flex-col overflow-y-auto" aria-label="Participants">
          {visible.map((person) => {
            const isSelected = person.id === selectedId;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : person.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-hover"
                >
                  <UserAvatar name={person.name} color={person.avatar_color} className="size-6" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-primary">{person.name}</span>
                    {person.email && (
                      <span className="block truncate text-xs text-muted">{person.email}</span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border border-strong",
                      isSelected && "border-primary-600 bg-primary-600 text-on-primary",
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
