import { MAX_VISIBLE_AVATARS } from "@/modules/meetings/constants";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { UserAvatar } from "@/shared/components/UserAvatar";

interface ParticipantAvatarStackProps {
  participants: ParticipantBrief[];
  max?: number;
}

/** Overlapping initials avatars with a "+N" for the rest. The names are read out as one label. */
export function ParticipantAvatarStack({
  participants,
  max = MAX_VISIBLE_AVATARS,
}: ParticipantAvatarStackProps) {
  if (participants.length === 0) return null;

  const visible = participants.slice(0, max);
  const overflow = participants.length - visible.length;
  const names = participants.map((person) => person.name).join(", ");

  return (
    <div
      role="img"
      aria-label={`Participants: ${names}`}
      title={names}
      className="flex -space-x-1.5"
    >
      {visible.map((person) => (
        <UserAvatar
          key={person.id}
          name={person.name}
          color={person.avatar_color}
          className="size-7 rounded-full text-[11px] ring-2 ring-card"
        />
      ))}
      {overflow > 0 && (
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full bg-active text-[11px] font-medium text-secondary ring-2 ring-card"
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
