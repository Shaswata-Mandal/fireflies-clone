"use client";

import { Copy, Download, FileText, MoreHorizontal, Pencil, Trash2, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { DeleteMeetingDialog } from "@/modules/meetings/components/DeleteMeetingDialog";
import { EditMeetingModal } from "@/modules/meetings/components/EditMeetingModal";
import { MEETINGS_COPY } from "@/modules/meetings/constants";
import { useExportMeeting } from "@/modules/meetings/hooks";
import type { ExportFormat } from "@/modules/meetings/types";
import { usePlayer } from "@/modules/player/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { meetingDetailRoute, ROUTES } from "@/shared/constants/routes";
import { copyToClipboard } from "@/shared/utils/clipboard";

interface MeetingActionsMenuProps {
  meetingId: number;
  title: string;
}

const ITEM_CLASS = "h-9 gap-3 px-3 text-sm text-default";
const MENU_CLASS = "border border-default bg-surface p-1.5 ring-0";

const EXPORT_OPTIONS: ReadonlyArray<{ format: ExportFormat; label: string }> = [
  { format: "md", label: "Markdown (.md)" },
  { format: "txt", label: "Plain text (.txt)" },
];

/**
 * The meeting "⋯" menu (18). Copy Link, Rename, Edit, Download and Delete work. Share / Regenerate /
 * Language / Meeting info are left out. Deleting pauses the player first, then leaves the page.
 */
export function MeetingActionsMenu({ meetingId, title }: MeetingActionsMenuProps) {
  const exportMutation = useExportMeeting();
  const router = useRouter();
  const { pause } = usePlayer();
  const [editMode, setEditMode] = useState<"edit" | "rename" | null>(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  async function handleCopyLink() {
    // The canonical link, without ?t= so it doesn't carry the current position.
    const ok = await copyToClipboard(`${window.location.origin}${meetingDetailRoute(meetingId)}`);
    if (ok) toast.success(MEETINGS_COPY.LINK_COPIED);
    else toast.error(MEETINGS_COPY.LINK_COPY_FAILED);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={triggerRef}
          aria-label={`More options for ${title}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary data-[state=open]:bg-hover"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-56 ${MENU_CLASS}`}>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={handleCopyLink}>
            <Copy aria-hidden="true" /> Copy Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => setEditMode("rename")}>
            <Type aria-hidden="true" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => setEditMode("edit")}>
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={ITEM_CLASS} disabled={exportMutation.isPending}>
              <Download aria-hidden="true" />{" "}
              {exportMutation.isPending ? "Downloading…" : "Download"}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={`w-48 ${MENU_CLASS}`}>
              {EXPORT_OPTIONS.map(({ format, label }) => (
                <DropdownMenuItem
                  key={format}
                  className={ITEM_CLASS}
                  onSelect={() => exportMutation.mutate({ id: meetingId, format })}
                >
                  <FileText aria-hidden="true" /> {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
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
      <EditMeetingModal
        meetingId={meetingId}
        open={editMode !== null}
        onOpenChange={(open) => !open && setEditMode(null)}
        focusTitle={editMode === "rename"}
        returnFocusRef={triggerRef}
      />
      <DeleteMeetingDialog
        meetingId={meetingId}
        title={title}
        open={isDeleteOpen}
        onOpenChange={setDeleteOpen}
        // A deleted meeting must not keep playing while the request runs.
        onBeforeDelete={pause}
        onDeleted={() => router.push(ROUTES.MEETINGS)}
        returnFocusRef={triggerRef}
      />
    </>
  );
}
