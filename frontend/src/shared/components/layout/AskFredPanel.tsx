"use client";

import { Ellipsis, PanelRightClose, Plus } from "lucide-react";
import { AskChatBody } from "@/modules/meetings/components/AskChatBody";
import type { useAskChat } from "@/modules/meetings/use-ask-chat";
import { FredMark } from "@/shared/components/FredMark";
import { IconButton } from "@/shared/components/IconButton";
import { AskFredHistoryPopover } from "@/shared/components/layout/AskFredHistoryPopover";
import { ASKFRED_CONTEXT_LABEL, ASKFRED_HEADLINE, PANEL_PROMPTS } from "@/shared/constants/askfred";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface AskFredPanelProps {
  /** Owned by AppShell so the dock and this panel share one conversation. */
  chat: ReturnType<typeof useAskChat>;
  onClose: () => void;
}

const PROMPT_LABELS = PANEL_PROMPTS.map(({ label }) => label);

/** Right-side assistant panel (docs/reference/06, 15): asks across all of the user's meetings. */
export function AskFredPanel({ chat, onClose }: AskFredPanelProps) {
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
          <IconButton label="New chat" onClick={chat.clear}>
            <Plus />
          </IconButton>
          <IconButton label="Close AskFred" onClick={onClose}>
            <PanelRightClose />
          </IconButton>
        </div>
      </header>

      <AskChatBody
        chat={chat}
        headline={ASKFRED_HEADLINE}
        prompts={PROMPT_LABELS}
        contextLabel={ASKFRED_CONTEXT_LABEL}
        showClear={false}
      />
    </aside>
  );
}
