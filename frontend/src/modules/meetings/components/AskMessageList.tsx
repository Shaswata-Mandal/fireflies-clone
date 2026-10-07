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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isPending, error]);

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
