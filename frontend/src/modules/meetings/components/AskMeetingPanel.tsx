/**
 * AskFred tab on the meeting page.
 *
 * WHAT: Creates a chat bound to this meeting and wires citation clicks to the player's `seek`.
 * LAYER: Module component (client).
 * CALLED BY: the meeting detail layout.
 * CALLS: `useAskChat`, `AskChatBody`, `usePlayer`.
 */

"use client";

import { AskChatBody } from "@/modules/meetings/components/AskChatBody";
import { ASK_COPY, ASK_SUGGESTED_PROMPTS } from "@/modules/meetings/constants";
import { useAskChat } from "@/modules/meetings/use-ask-chat";
import { usePlayer } from "@/modules/player/hooks";

interface AskMeetingPanelProps {
  meetingId: number;
}

/** AskFred on the meeting page: ask questions answered from this meeting's transcript. */
export function AskMeetingPanel({ meetingId }: AskMeetingPanelProps) {
  const chat = useAskChat(meetingId);
  const { seek } = usePlayer();

  return (
    <AskChatBody
      chat={chat}
      headline={ASK_COPY.HEADLINE}
      prompts={ASK_SUGGESTED_PROMPTS}
      contextLabel={ASK_COPY.CONTEXT_LABEL}
      onSeek={seek}
    />
  );
}
