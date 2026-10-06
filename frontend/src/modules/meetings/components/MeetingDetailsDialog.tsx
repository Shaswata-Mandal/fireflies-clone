"use client";

import { ChevronDown, Hash, Lock, Upload, Video } from "lucide-react";
import type { ReactNode } from "react";
import { MEETING_VIEW_LABELS } from "@/modules/meetings/constants";
import { useMeeting } from "@/modules/meetings/hooks";
import { UserAvatar } from "@/shared/components/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatMeetingDateTime } from "@/shared/utils/format-date";
import { formatDuration } from "@/shared/utils/format-time";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface MeetingDetailsDialogProps {
  meetingId: number;
  /** Shown while the detail request is in flight. */
  fallbackTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS = { host: "Host", attendee: "Attendee" } as const;

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[8rem_1fr] sm:items-start">
      <dt className="pt-1 text-sm font-medium text-primary">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/**
 * Screenshot 12. The list row has no emails or roles, so the full meeting is fetched only while the
 * dialog is open (and is then cached for the detail page).
 */
export function MeetingDetailsDialog({
  meetingId,
  fallbackTitle,
  open,
  onOpenChange,
}: MeetingDetailsDialogProps) {
  const { data: meeting, isPending, isError, refetch } = useMeeting(meetingId, open);
  const host = meeting?.participants.find((p) => p.role === "host") ?? meeting?.participants[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <header className="flex items-start gap-4 border-b px-6 py-5 pr-12">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-card">
            <Video className="size-5 text-default" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2">
              <span className="truncate">{meeting?.title ?? fallbackTitle}</span>
              {meeting?.platform === "upload" && (
                <Upload className="size-4 shrink-0 text-muted" aria-label="Uploaded" />
              )}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {meeting
                ? [
                    host?.name,
                    formatMeetingDateTime(meeting.meeting_date),
                    formatDuration(meeting.duration_ms),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Loading meeting details…"}
            </DialogDescription>
          </div>
        </header>

        {isPending && (
          <div className="flex flex-col gap-4 px-6 py-6" aria-busy="true">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        )}

        {isError && (
          <p className="px-6 py-6 text-sm text-muted">
            Couldn&apos;t load the meeting details.{" "}
            <button type="button" onClick={() => refetch()} className="text-link hover:underline">
              Retry
            </button>
          </p>
        )}

        {meeting && (
          <dl className="flex flex-col gap-6 px-6 py-6">
            <DetailRow label="Privacy">
              <button
                type="button"
                onClick={() => showComingSoon("Privacy settings")}
                className="flex items-center gap-2 rounded-md py-1 text-sm text-primary-fg hover:underline"
              >
                <Lock className="size-4" aria-hidden="true" />
                Only Owner
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            </DetailRow>

            <DetailRow label="Channels">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex flex-wrap gap-3 text-sm text-default">
                  {Object.values(MEETING_VIEW_LABELS).map((label) => (
                    <span key={label} className="flex items-center gap-1">
                      <Hash className="size-3.5 text-muted" aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => showComingSoon("Move to channel")}
                  className="h-9 rounded-md border bg-card px-3 text-sm text-default hover:bg-hover"
                >
                  Move to channel
                </button>
              </div>
            </DetailRow>

            <DetailRow label="Invited">
              <ul className="flex max-h-60 flex-col gap-3 overflow-y-auto">
                {meeting.participants.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <UserAvatar name={person.name} color={person.avatar_color} className="size-6" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-primary">
                        {person.name}
                      </span>
                      <span className="block truncate text-xs text-secondary">
                        {[person.email, ROLE_LABELS[person.role]].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </DetailRow>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
