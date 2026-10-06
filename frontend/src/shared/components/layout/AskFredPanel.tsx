"use client";

import { Ellipsis, Info, PanelRightClose, Plus } from "lucide-react";
import { FredMark } from "@/shared/components/FredMark";
import { IconButton } from "@/shared/components/IconButton";
import { AskFredComposer } from "@/shared/components/layout/AskFredComposer";
import { AskFredEmptyState } from "@/shared/components/layout/AskFredEmptyState";
import { AskFredHistoryPopover } from "@/shared/components/layout/AskFredHistoryPopover";
import { ASKFRED_COMING_SOON } from "@/shared/constants/messages";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface AskFredPanelProps {
  /** True once the user has sent something; chat isn't built, so we explain that instead. */
  showComingSoonNote: boolean;
  onAsk: (message: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

/** Right-side assistant panel (docs/reference/06, 15). Full-screen overlay below the lg breakpoint. */
export function AskFredPanel({ showComingSoonNote, onAsk, onNewChat, onClose }: AskFredPanelProps) {
  return (
    <aside
      aria-label="AskFred"
      className="fixed inset-0 z-40 flex flex-col bg-page lg:static lg:z-auto lg:w-110 lg:shrink-0 lg:border-l"
    >
      <header className="flex h-13 shrink-0 items-center gap-2 border-b px-4">
        <FredMark className="size-5 text-primary-fg" />
        <h2 className="text-base font-medium text-link">AskFred</h2>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="AskFred options" onClick={() => showComingSoon("AskFred options")}>
            <Ellipsis />
          </IconButton>
          <AskFredHistoryPopover />
          <IconButton label="New chat" onClick={onNewChat}>
            <Plus />
          </IconButton>
          <IconButton label="Close AskFred" onClick={onClose}>
            <PanelRightClose />
          </IconButton>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <AskFredEmptyState onPrompt={onAsk} />
        {showComingSoonNote && (
          <p
            role="status"
            className="mx-6 mt-8 flex gap-2 rounded-lg bg-primary-subtle px-4 py-3 text-sm text-default"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-primary-fg" aria-hidden="true" />
            {ASKFRED_COMING_SOON}
          </p>
        )}
      </div>

      <div className="shrink-0 p-4">
        <AskFredComposer variant="panel" onSend={onAsk} />
      </div>
    </aside>
  );
}
