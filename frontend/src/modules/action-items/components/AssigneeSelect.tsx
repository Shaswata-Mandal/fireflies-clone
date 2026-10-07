import type { ComponentProps } from "react";
import { UNASSIGNED_VALUE } from "@/modules/action-items/constants";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { cn } from "@/shared/utils/cn";

interface AssigneeSelectProps extends ComponentProps<"select"> {
  /** Only this meeting's participants: the API rejects anyone else with 422. */
  participants: ReadonlyArray<ParticipantBrief>;
}

/** Native select (keyboard and screen-reader support for free). Spreads react-hook-form's register. */
export function AssigneeSelect({ participants, className, ...props }: AssigneeSelectProps) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-strong bg-card px-2 text-sm text-default outline-none focus:border-focus",
        className,
      )}
      {...props}
    >
      <option value={UNASSIGNED_VALUE}>Unassigned</option>
      {participants.map((participant) => (
        <option key={participant.id} value={String(participant.id)}>
          {participant.name}
        </option>
      ))}
    </select>
  );
}
