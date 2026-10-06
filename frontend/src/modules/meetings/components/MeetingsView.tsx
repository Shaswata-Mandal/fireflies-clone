"use client";

import { useMemo } from "react";
import { ActiveFilterChips } from "@/modules/meetings/components/ActiveFilterChips";
import { MeetingsEmptyState } from "@/modules/meetings/components/MeetingsEmptyState";
import { MeetingsErrorState } from "@/modules/meetings/components/MeetingsErrorState";
import { MeetingsList } from "@/modules/meetings/components/MeetingsList";
import { MeetingsPagination } from "@/modules/meetings/components/MeetingsPagination";
import { MeetingsSkeleton } from "@/modules/meetings/components/MeetingsSkeleton";
import { MeetingsTabs } from "@/modules/meetings/components/MeetingsTabs";
import { MeetingsToolbar } from "@/modules/meetings/components/MeetingsToolbar";
import { useMeetings } from "@/modules/meetings/hooks";
import { useMeetingsUrlState } from "@/modules/meetings/use-meetings-url-state";
import { clearFilters, hasActiveFilters, toMeetingsQuery } from "@/modules/meetings/url-state";

/**
 * Meetings library: channel tabs | toolbar + list. The URL holds every piece of view state; this
 * component only maps (URL state, query status) to the one body that should be on screen.
 */
export function MeetingsView() {
  const { state, update, setState } = useMeetingsUrlState();
  const query = useMemo(() => toMeetingsQuery(state), [state]);
  const { data, error, isPending, isError, isFetching, isPlaceholderData, refetch } =
    useMeetings(query);

  const handleClearFilters = () => setState(clearFilters(state));
  const onlySearchActive =
    state.q !== "" && state.participantId === null && !state.dateFrom && !state.dateTo;

  function renderBody() {
    if (isPending) return <MeetingsSkeleton />;
    if (isError) {
      return <MeetingsErrorState error={error} onRetry={() => refetch()} isRetrying={isFetching} />;
    }
    if (data.total === 0) {
      return hasActiveFilters(state) ? (
        <MeetingsEmptyState
          variant="no-results"
          actionLabel={onlySearchActive ? "Clear Search" : "Clear filters"}
          onClear={handleClearFilters}
        />
      ) : (
        <MeetingsEmptyState variant="no-meetings" />
      );
    }

    const totalPages = Math.ceil(data.total / data.limit);
    // A shared or stale link can point past the last page (e.g. ?page=9 after deletions).
    if (data.items.length === 0) {
      return (
        <p className="py-12 text-center text-sm text-secondary">
          This page is empty.{" "}
          <button
            type="button"
            onClick={() => update({ page: 1 })}
            className="text-link hover:underline"
          >
            Go to the first page
          </button>
        </p>
      );
    }

    return (
      <>
        <MeetingsList
          items={data.items}
          sort={state.sort}
          isLastPage={state.page >= totalPages}
          isStale={isPlaceholderData}
        />
        <MeetingsPagination
          page={state.page}
          totalPages={totalPages}
          onPageChange={(page) => update({ page })}
        />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <MeetingsTabs variant="panel" view={state.view} onChange={(view) => update({ view })} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <MeetingsTabs variant="bar" view={state.view} onChange={(view) => update({ view })} />
        <MeetingsToolbar state={state} onChange={update} />
        <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
          <ActiveFilterChips state={state} onChange={update} onClearAll={handleClearFilters} />
          {renderBody()}
        </div>
      </div>
    </div>
  );
}
