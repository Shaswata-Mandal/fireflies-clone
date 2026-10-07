"use client";

import { ActionItemRow } from "@/modules/action-items/components/ActionItemRow";
import { ActionItemSection } from "@/modules/action-items/components/ActionItemSection";
import { ACTION_ITEMS_COPY } from "@/modules/action-items/constants";
import type { ActionItem } from "@/modules/action-items/types";
import { groupActionItems, isOverdue } from "@/modules/action-items/utils";
import type { ParticipantBrief } from "@/modules/meetings/types";

interface ActionItemListProps {
  items: ReadonlyArray<ActionItem>;
  participants: ReadonlyArray<ParticipantBrief>;
  /** "Today" for the overdue check, taken at render time by the panel. */
  now: Date;
}

/** Open items first, then completed (hidden when there are none). */
export function ActionItemList({ items, participants, now }: ActionItemListProps) {
  const { open, completed } = groupActionItems(items);

  const renderRows = (rows: ReadonlyArray<ActionItem>) => (
    <ul className="flex flex-col">
      {rows.map((item) => (
        <ActionItemRow
          key={item.id}
          item={item}
          participants={participants}
          isOverdue={isOverdue(item, now)}
        />
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-6">
      <ActionItemSection title={ACTION_ITEMS_COPY.OPEN_HEADING} count={open.length}>
        {open.length > 0 ? (
          renderRows(open)
        ) : (
          <p className="px-3 py-2 text-sm text-muted">{ACTION_ITEMS_COPY.NO_OPEN}</p>
        )}
      </ActionItemSection>
      {completed.length > 0 && (
        <ActionItemSection title={ACTION_ITEMS_COPY.COMPLETED_HEADING} count={completed.length}>
          {renderRows(completed)}
        </ActionItemSection>
      )}
    </div>
  );
}
