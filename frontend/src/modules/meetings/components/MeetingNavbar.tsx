/**
 * Top bar of the meeting page.
 *
 * WHAT: Menu button, breadcrumb back to the library, the meeting actions menu, and header buttons
 *   (Share, copy link, upload, notifications, account).
 * LAYER: Module component (client).
 * CALLED BY: `MeetingDetailView` and `MeetingDetailLayout`.
 * CALLS: `MeetingActionsMenu`, `useUI`, `useCreateMeetingModal`, shared layout pieces.
 */

"use client";

import { ChevronDown, Hash, Link2, Lock, Menu, Plus } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { MeetingActionsMenu } from "@/modules/meetings/components/MeetingActionsMenu";
import { useCreateMeetingModal } from "@/modules/meetings/context/CreateMeetingContext";
import type { MeetingDetail } from "@/modules/meetings/types";
import { IconButton } from "@/shared/components/IconButton";
import { AvatarMenu } from "@/shared/components/layout/AvatarMenu";
import { NotificationsPopover } from "@/shared/components/layout/NotificationsPopover";
import { ROUTES } from "@/shared/constants/routes";
import { useUI } from "@/shared/context/UIContext";
import { copyToClipboard } from "@/shared/utils/clipboard";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface MeetingNavbarProps {
  /** Null while loading or when the meeting doesn't exist: only the way back is shown. */
  meeting: MeetingDetail | null;
}

const LIBRARY_LABEL = "#My Meetings";
const ACTION_BUTTON = "flex h-8 items-center gap-2 px-3 text-sm font-medium";

/**
 * Top bar of the meeting page (docs/reference/17): ☰ · #My Meetings / title ⋯ on the left, then
 * Upgrade, Slack, Share, +, bell and the account avatar. The breadcrumb links back to the library.
 */
export function MeetingNavbar({ meeting }: MeetingNavbarProps) {
  const { setMobileNavOpen } = useUI();
  const { open: openCreateMeeting } = useCreateMeetingModal();

  // `async` because the clipboard API returns a Promise; the click handler wraps it in `void`.
  async function copyMeetingLink() {
    const copied = await copyToClipboard(window.location.href);
    if (copied) toast.success("Link copied");
    else toast.error("Couldn't copy the link");
  }

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b bg-surface px-3 sm:px-4">
      <IconButton label="Open navigation" onClick={() => setMobileNavOpen(true)}>
        <Menu className="size-5" />
      </IconButton>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-base">
        <Link href={ROUTES.MEETINGS} className="shrink-0 text-secondary hover:text-primary">
          {LIBRARY_LABEL}
        </Link>
        {meeting && (
          <>
            <span aria-hidden="true" className="text-muted">
              /
            </span>
            <span aria-current="page" className="min-w-0 truncate text-primary">
              {meeting.title}
            </span>
            <MeetingActionsMenu meetingId={meeting.id} title={meeting.title} />
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => showComingSoon("Upgrade")}
          className="hidden h-8 items-center rounded-md bg-success-btn px-3 text-sm font-medium text-success-btn-fg hover:brightness-125 sm:flex"
        >
          Upgrade
        </button>
        <span className="hidden h-6 border-l sm:block" aria-hidden="true" />
        <button
          type="button"
          onClick={() => showComingSoon("Slack")}
          aria-label="Share to Slack"
          className="hidden h-8 items-center gap-1 rounded-md px-2 text-secondary hover:bg-hover sm:flex"
        >
          <Hash className="size-5" aria-hidden="true" />
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
        {meeting && (
          <div className="hidden h-8 overflow-hidden rounded-md bg-primary-600 text-on-primary sm:flex">
            <button
              type="button"
              onClick={() => showComingSoon("Sharing")}
              className={`${ACTION_BUTTON} hover:bg-primary-700`}
            >
              <Lock className="size-4" aria-hidden="true" />
              Share
            </button>
            <button
              type="button"
              onClick={() => void copyMeetingLink()}
              aria-label="Copy meeting link"
              className="flex items-center border-l border-white/20 px-2 hover:bg-primary-700"
            >
              <Link2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <span className="hidden h-6 border-l sm:block" aria-hidden="true" />
        <IconButton label="Upload a meeting" onClick={openCreateMeeting} className="border">
          <Plus />
        </IconButton>
        <NotificationsPopover />
        <AvatarMenu collapsed />
      </div>
    </header>
  );
}
