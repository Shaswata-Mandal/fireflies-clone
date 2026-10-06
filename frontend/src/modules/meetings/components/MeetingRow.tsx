import { ArrowUp, ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";
import { MeetingRowActions } from "@/modules/meetings/components/MeetingRowActions";
import { ParticipantAvatarStack } from "@/modules/meetings/components/ParticipantAvatarStack";
import type { MeetingListItem } from "@/modules/meetings/types";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { meetingDetailRoute } from "@/shared/constants/routes";
import { formatMeetingDate, formatMeetingTime } from "@/shared/utils/format-date";
import { formatDuration } from "@/shared/utils/format-time";

interface MeetingRowProps {
  meeting: MeetingListItem;
}

// Revealed on hover/focus (screenshot 11). Kept visible while its menu or dialog is open, and
// always visible below md where there is no hover.
const ACTIONS_CLASS =
  "relative z-10 flex md:hidden md:group-hover:flex md:group-focus-within:flex md:has-[[data-state=open]]:flex";
const META_CLASS =
  "flex items-center gap-3 md:group-hover:hidden md:group-focus-within:hidden md:group-has-[[data-state=open]]:hidden";

/**
 * One meeting card (screenshot 09). The title link is "stretched" over the whole card with an
 * ::after overlay, so the card is a real link (keyboard, middle-click, open in new tab) without
 * nesting the action buttons inside an <a>, which is invalid HTML.
 */
export function MeetingRow({ meeting }: MeetingRowProps) {
  const host = meeting.participants[0];
  const meta = [
    formatMeetingDate(meeting.meeting_date),
    formatMeetingTime(meeting.meeting_date),
    formatDuration(meeting.duration_ms),
    host?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative flex flex-col gap-3 rounded-xl border bg-card px-5 py-4 transition-colors focus-within:border-focus hover:border-strong sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <UserAvatar
          name={host?.name ?? meeting.title}
          color={host?.avatar_color}
          className="size-10 rounded-md text-lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-primary">
            <Link
              href={meetingDetailRoute(meeting.id)}
              className="truncate outline-none after:absolute after:inset-0 after:rounded-xl"
            >
              {meeting.title}
            </Link>
            <ChevronRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {meeting.platform === "upload" && (
              <ArrowUp className="size-3.5 shrink-0 text-muted" aria-label="Uploaded" />
            )}
          </h3>
          <p className="mt-0.5 truncate text-sm text-secondary">{meta}</p>
          {meeting.summary_preview && (
            <p className="mt-1 line-clamp-2 text-sm text-muted sm:line-clamp-1">
              {meeting.summary_preview}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pl-14 sm:justify-end sm:pl-0">
        <div className={META_CLASS}>
          {meeting.tags.map((tag) => (
            <span
              key={tag.id}
              className="hidden items-center gap-1.5 rounded-full bg-active px-2 py-0.5 text-xs text-secondary lg:flex"
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-primary-fg"
                style={tag.color ? { backgroundColor: tag.color } : undefined}
              />
              {tag.name}
            </span>
          ))}
          {meeting.action_items_open > 0 && (
            <span
              title={`${meeting.action_items_open} open action items`}
              className="flex items-center gap-1 rounded-md bg-primary-subtle px-2 py-0.5 text-xs text-primary-fg"
            >
              <ListChecks className="size-3.5" aria-hidden="true" />
              {meeting.action_items_open}
              <span className="sr-only"> open action items</span>
            </span>
          )}
          <ParticipantAvatarStack participants={meeting.participants} />
        </div>
        <div className={ACTIONS_CLASS}>
          <MeetingRowActions meeting={meeting} />
        </div>
      </div>
    </article>
  );
}
