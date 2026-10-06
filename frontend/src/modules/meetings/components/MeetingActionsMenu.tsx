"use client";

import { Copy, Download, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { MEETINGS_COPY } from "@/modules/meetings/constants";
import { useExportMeeting } from "@/modules/meetings/hooks";
import type { ExportFormat } from "@/modules/meetings/types";
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
import { meetingDetailRoute } from "@/shared/constants/routes";
import { copyToClipboard } from "@/shared/utils/clipboard";
import { showComingSoon } from "@/shared/utils/coming-soon";

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
 * The meeting "⋯" menu (18). Copy Link and Download work; Edit and Delete arrive with their
 * flows in a later slice. Share / Regenerate / Language / Meeting info are left out.
 */
export function MeetingActionsMenu({ meetingId, title }: MeetingActionsMenuProps) {
  const exportMutation = useExportMeeting();

  async function handleCopyLink() {
    // The canonical link, without ?t= so it doesn't carry the current position.
    const ok = await copyToClipboard(`${window.location.origin}${meetingDetailRoute(meetingId)}`);
    if (ok) toast.success(MEETINGS_COPY.LINK_COPIED);
    else toast.error(MEETINGS_COPY.LINK_COPY_FAILED);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
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
        <DropdownMenuItem className={ITEM_CLASS} onSelect={() => showComingSoon("Edit")}>
          <Pencil aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ITEM_CLASS} disabled={exportMutation.isPending}>
            <Download aria-hidden="true" /> {exportMutation.isPending ? "Downloading…" : "Download"}
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
          onSelect={() => showComingSoon("Delete")}
        >
          <Trash2 aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
