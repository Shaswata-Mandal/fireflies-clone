/**
 * Scrolling list of chat messages.
 *
 * WHAT: Renders messages, a "Thinking..." row, the error notice, and keeps the newest in view.
 * LAYER: Module component (client: effect + ref).
 * CALLED BY: `AskChatBody`.
 * CALLS: `AskMessageBubble`, `AskErrorNotice`.
 */

"use client";

import { useEffect, useRef } from "react";
import type { AskErrorView } from "@/modules/meetings/ask-errors";
import { AskErrorNotice } from "@/modules/meetings/components/AskErrorNotice";
import { AskMessageBubble } from "@/modules/meetings/components/AskMessageBubble";
import { ASK_COPY } from "@/modules/meetings/constants";
import type { AskChatMessage } from "@/modules/meetings/use-ask-chat";

interface AskMessageListProps {
  messages: AskChatMessage[];
  isPending: boolean;
  error: AskErrorView | null;
  onRetry: () => void;
  onSeek?: (ms: number) => void;
}

/** The conversation, a "thinking" row while waiting, and the inline error. Sticks to the bottom. */
export function AskMessageList({
  messages,
  isPending,
  error,
  onRetry,
  onSeek,
}: AskMessageListProps) {
  // A ref to an empty <div> at the bottom; scrolling it into view scrolls the whole list down.
  const endRef = useRef<HTMLDivElement>(null);

  // Runs after the render whenever a message arrives, loading starts/ends or an error appears.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isPending, error]);

  // `role="log"` + `aria-live="polite"`: screen readers announce new messages without
  // interrupting what they are reading.
  return (
    <div role="log" aria-live="polite" className="flex flex-col gap-3 px-4 py-4">
      <ul className="flex flex-col gap-3">
        {messages.map((message) => (
          <AskMessageBubble key={message.id} message={message} onSeek={onSeek} />
        ))}
      </ul>
      {isPending && (
        <p className="animate-pulse text-sm text-muted" role="status">
          {ASK_COPY.THINKING}
        </p>
      )}
      {error && <AskErrorNotice error={error} onRetry={onRetry} />}
      <div ref={endRef} />
    </div>
  );
}
