"use client";

import { CircleCheck } from "lucide-react";
import { ActionItemsSkeleton } from "@/modules/action-items/components/ActionItemsSkeleton";
import { useOpenActionItems } from "@/modules/action-items/hooks";
import { isOverdue } from "@/modules/action-items/utils";
import { OpenActionItemRow } from "@/modules/home/components/OpenActionItemRow";
import { HOME_COPY, HOME_LIST_LIMIT } from "@/modules/home/constants";
import { ErrorState } from "@/shared/components/ErrorState";

export function OpenActionItemsSection() {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useOpenActionItems(HOME_LIST_LIMIT);

  function renderBody() {
    if (isPending) return <ActionItemsSkeleton />;
    if (isError) {
      return (
        <ErrorState
          title={HOME_COPY.ACTIONS_ERROR}
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      );
    }
    if (data.items.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-6 py-12 text-center">
          <CircleCheck className="size-8 text-primary-fg" aria-hidden="true" />
          <h3 className="text-base font-medium text-primary">{HOME_COPY.ACTIONS_EMPTY_TITLE}</h3>
          <p className="max-w-sm text-sm text-muted">{HOME_COPY.ACTIONS_EMPTY_BODY}</p>
        </div>
      );
    }
    // One "now" for the whole render, so every row agrees on what overdue means.
    const now = new Date();
    return (
      <ul className="flex flex-col rounded-xl border bg-card p-2">
        {data.items.map((item) => (
          <OpenActionItemRow key={item.id} item={item} isOverdue={isOverdue(item, now)} />
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="open-actions-heading" className="flex flex-col gap-3">
      <h2 id="open-actions-heading" className="text-lg font-medium text-primary">
        {HOME_COPY.ACTIONS_HEADING}
      </h2>
      {renderBody()}
    </section>
  );
}
