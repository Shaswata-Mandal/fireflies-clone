import { DueDateLabel } from "@/modules/action-items/components/DueDateLabel";
import { SourceTimestampChip } from "@/modules/action-items/components/SourceTimestampChip";
import type { ActionItem } from "@/modules/action-items/types";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { UserAvatar } from "@/shared/components/UserAvatar";

interface ActionItemMetaProps {
  item: ActionItem;
  participants: ReadonlyArray<ParticipantBrief>;
  isOverdue: boolean;
}

/** Assignee, due date and source timestamp under the text; renders nothing when all are empty. */
export function ActionItemMeta({ item, participants, isOverdue }: ActionItemMetaProps) {
  const { assignee, due_date: dueDate, source_start_ms: sourceStartMs } = item;
  if (!assignee && !dueDate && sourceStartMs === null) return null;

  // The item only carries id + name; the avatar color lives on the meeting's participant.
  const assigneeColor = participants.find((person) => person.id === assignee?.id)?.avatar_color;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
      {assignee && (
        <span className="inline-flex items-center gap-1.5">
          <UserAvatar name={assignee.name} color={assigneeColor} className="size-5 text-[9px]" />
          <span className="sr-only">Assigned to </span>
          {assignee.name}
        </span>
      )}
      {dueDate && <DueDateLabel dueDate={dueDate} isOverdue={isOverdue} />}
      {sourceStartMs !== null && <SourceTimestampChip startMs={sourceStartMs} />}
    </div>
  );
}
