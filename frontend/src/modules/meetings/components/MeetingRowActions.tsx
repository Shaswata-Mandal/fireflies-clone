"use client";

import {
  ArrowUpRight,
  ChevronRight,
  Copy,
  Download,
  Forward,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { DeleteMeetingDialog } from "@/modules/meetings/components/DeleteMeetingDialog";
import { EditMeetingModal } from "@/modules/meetings/components/EditMeetingModal";
import { MeetingDetailsDialog } from "@/modules/meetings/components/MeetingDetailsDialog";
import { MEETINGS_COPY } from "@/modules/meetings/constants";
import type { MeetingListItem } from "@/modules/meetings/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { meetingDetailRoute } from "@/shared/constants/routes";
import { copyToClipboard } from "@/shared/utils/clipboard";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface MeetingRowActionsProps {
  meeting: MeetingListItem;
}

const ITEM_CLASS = "h-9 gap-3 px-3 text-sm text-default";

/**
 * "⋯" menu (screenshot 11) and "Details" popup (12). Open, Copy Link, Rename, Edit and Delete work;
 * Share / Download / Move are out of scope, so they say "Coming soon". The dialogs live here, next
 * to the menu (not inside it), so they stay mounted after the menu closes.
 */
export function MeetingRowActions({ meeting }: MeetingRowActionsProps) {
  const router = useRouter();
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [editMode, setEditMode] = useState<"edit" | "rename" | null>(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const href = meetingDetailRoute(meeting.id);

  async function handleCopyLink() {
    const ok = await copyToClipboard(`${window.location.origin}${href}`);
    if (ok) toast.success(MEETINGS_COPY.LINK_COPIED);
    else toast.error(MEETINGS_COPY.LINK_COPY_FAILED);
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={triggerRef}
          aria-label={`More options for ${meeting.title}`}
          className="flex size-9 items-center justify-center rounded-md border bg-card text-default hover:bg-hover data-[state=open]:bg-hover"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 border border-default bg-surface p-1.5 ring-0"
        >
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => router.push(href)}>
            <ArrowUpRight aria-hidden="true" /> Open
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => showComingSoon("Share")}>
            <Share2 aria-hidden="true" /> Share
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={handleCopyLink}>
            <Copy aria-hidden="true" /> Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => showComingSoon("Download")}>
            <Download aria-hidden="true" /> Download
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM_CLASS}
            onSelect={() => showComingSoon("Move to channel")}
          >
            <Forward aria-hidden="true" /> Move to channel
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => setEditMode("rename")}>
            <Type aria-hidden="true" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => setEditMode("edit")}>
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="h-9 gap-3 px-3 text-sm text-danger-fg"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        data-state={isDetailsOpen ? "open" : "closed"}
        className="flex h-9 items-center gap-2 rounded-md border bg-card px-4 text-sm text-default hover:bg-hover"
      >
        Details
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>

      <MeetingDetailsDialog
        meetingId={meeting.id}
        fallbackTitle={meeting.title}
        open={isDetailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <EditMeetingModal
        meetingId={meeting.id}
        open={editMode !== null}
        onOpenChange={(open) => !open && setEditMode(null)}
        focusTitle={editMode === "rename"}
        returnFocusRef={triggerRef}
      />
      <DeleteMeetingDialog
        meetingId={meeting.id}
        title={meeting.title}
        open={isDeleteOpen}
        onOpenChange={setDeleteOpen}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
