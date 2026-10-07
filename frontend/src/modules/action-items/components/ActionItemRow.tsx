"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionItemForm } from "@/modules/action-items/components/ActionItemForm";
import { ActionItemMeta } from "@/modules/action-items/components/ActionItemMeta";
import { DeleteActionItemDialog } from "@/modules/action-items/components/DeleteActionItemDialog";
import {
  useDeleteActionItem,
  useToggleActionItem,
  useUpdateActionItem,
} from "@/modules/action-items/hooks";
import { toActionItemFormInput } from "@/modules/action-items/schema";
import type { ActionItem } from "@/modules/action-items/types";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { IconButton } from "@/shared/components/IconButton";
import { cn } from "@/shared/utils/cn";

interface ActionItemRowProps {
  item: ActionItem;
  participants: ReadonlyArray<ParticipantBrief>;
  /** Decided once per render of the list, so every row agrees on "today". */
  isOverdue: boolean;
}

/**
 * One action item. Each row owns its mutation hooks, so `isPending` (and the disabled controls)
 * belong to this row only. Toggle and delete are optimistic (see hooks.ts); edit waits.
 */
export function ActionItemRow({ item, participants, isOverdue }: ActionItemRowProps) {
  const [isEditing, setEditing] = useState(false);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const toggle = useToggleActionItem(item.meeting_id);
  const update = useUpdateActionItem(item.meeting_id);
  const remove = useDeleteActionItem(item.meeting_id);

  if (isEditing) {
    return (
      <li className="rounded-lg border bg-card p-3">
        <ActionItemForm
          participants={participants}
          isPending={update.isPending}
          onSubmit={async (values) => {
            await update.mutateAsync({ id: item.id, body: values });
            setEditing(false);
          }}
          edit={{ defaultValues: toActionItemFormInput(item), onCancel: () => setEditing(false) }}
        />
      </li>
    );
  }

  const checkboxId = `action-item-${item.id}`;
  const nextState = item.is_completed ? "not done" : "done";

  return (
    <li className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-hover">
      <input
        id={checkboxId}
        type="checkbox"
        checked={item.is_completed}
        disabled={toggle.isPending}
        onChange={() => toggle.mutate({ id: item.id, isCompleted: !item.is_completed })}
        aria-label={`Mark "${item.text}" as ${nextState}`}
        className="mt-1 size-4 shrink-0 accent-primary-600"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          className={cn(
            "text-sm leading-6 break-words",
            item.is_completed ? "text-muted line-through" : "text-body",
          )}
        >
          {item.text}
        </p>
        <ActionItemMeta item={item} participants={participants} isOverdue={isOverdue} />
      </div>
      {/* Always visible on touch screens; revealed on hover / focus from sm up. */}
      <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <IconButton label={`Edit "${item.text}"`} onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" />
        </IconButton>
        <IconButton
          label={`Delete "${item.text}"`}
          onClick={() => setConfirmingDelete(true)}
          disabled={remove.isPending}
          className="hover:text-danger-fg"
        >
          <Trash2 aria-hidden="true" />
        </IconButton>
      </div>
      <DeleteActionItemDialog
        open={isConfirmingDelete}
        onOpenChange={setConfirmingDelete}
        itemText={item.text}
        onConfirm={() => {
          setConfirmingDelete(false);
          remove.mutate(item.id);
        }}
      />
    </li>
  );
}
