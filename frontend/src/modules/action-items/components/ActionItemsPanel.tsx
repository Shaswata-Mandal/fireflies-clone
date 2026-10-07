"use client";

import { ListChecks } from "lucide-react";
import { ActionItemForm } from "@/modules/action-items/components/ActionItemForm";
import { ActionItemList } from "@/modules/action-items/components/ActionItemList";
import { ActionItemsSkeleton } from "@/modules/action-items/components/ActionItemsSkeleton";
import { ACTION_ITEMS_COPY } from "@/modules/action-items/constants";
import { useActionItems, useCreateActionItem } from "@/modules/action-items/hooks";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { ErrorState } from "@/shared/components/ErrorState";

interface ActionItemsPanelProps {
  meetingId: number;
  participants: ReadonlyArray<ParticipantBrief>;
}

/** Action Items tab: add form on top, then loading / inline error with Retry / empty / list. */
export function ActionItemsPanel({ meetingId, participants }: ActionItemsPanelProps) {
  const {
    data: items,
    error,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useActionItems(meetingId);
  const create = useCreateActionItem(meetingId);
  // Taken at render time (not stored), so "overdue" is right whenever the list re-renders.
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <ActionItemForm
        participants={participants}
        isPending={create.isPending}
        onSubmit={(values) => create.mutateAsync(values)}
      />

      {isPending && <ActionItemsSkeleton />}
      {isError && (
        <ErrorState
          title={ACTION_ITEMS_COPY.ERROR_TITLE}
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      )}
      {items?.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <ListChecks className="size-8 text-muted" aria-hidden="true" />
          <h3 className="text-base font-medium text-primary">{ACTION_ITEMS_COPY.EMPTY_TITLE}</h3>
          <p className="max-w-sm text-sm text-secondary">{ACTION_ITEMS_COPY.EMPTY_BODY}</p>
        </div>
      )}
      {items && items.length > 0 && (
        <ActionItemList items={items} participants={participants} now={now} />
      )}
    </div>
  );
}
