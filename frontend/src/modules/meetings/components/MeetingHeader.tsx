import { Video, VideoOff } from "lucide-react";
import { MeetingActionsMenu } from "@/modules/meetings/components/MeetingActionsMenu";
import { ParticipantAvatarStack } from "@/modules/meetings/components/ParticipantAvatarStack";
import type { MeetingDetail } from "@/modules/meetings/types";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { formatMeetingHeaderDate } from "@/shared/utils/format-date";
import { formatDuration } from "@/shared/utils/format-time";

interface MeetingHeaderProps {
  meeting: MeetingDetail;
  isVideoVisible: boolean;
  onToggleVideo: () => void;
}

/**
 * Title row and meta line from 17: title + ⋯ menu + "Video" toggle, then host, date and time,
 * duration and participant avatars. (In Fireflies the ⋯ sits in the navbar breadcrumb; here it
 * stays next to the title so the global navbar doesn't need page data.)
 */
export function MeetingHeader({ meeting, isVideoVisible, onToggleVideo }: MeetingHeaderProps) {
  const host =
    meeting.participants.find((person) => person.role === "host") ?? meeting.participants[0];

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-medium break-words text-primary">
          {meeting.title}
        </h1>
        <MeetingActionsMenu meetingId={meeting.id} title={meeting.title} />
        <button
          type="button"
          onClick={onToggleVideo}
          aria-pressed={isVideoVisible}
          className="flex h-9 shrink-0 items-center gap-2 rounded-md border bg-page px-3 text-sm text-default hover:bg-hover"
        >
          {isVideoVisible ? (
            <VideoOff className="size-4" aria-hidden="true" />
          ) : (
            <Video className="size-4" aria-hidden="true" />
          )}
          Video
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-secondary">
        {host && (
          <span className="flex items-center gap-2">
            <UserAvatar name={host.name} color={host.avatar_color} className="size-5 text-[10px]" />
            <span className="underline underline-offset-4">{host.name}</span>
          </span>
        )}
        <time dateTime={meeting.meeting_date}>{formatMeetingHeaderDate(meeting.meeting_date)}</time>
        <span aria-hidden="true">·</span>
        <span>{formatDuration(meeting.duration_ms)}</span>
        <ParticipantAvatarStack participants={meeting.participants} />
      </div>
    </header>
  );
}
