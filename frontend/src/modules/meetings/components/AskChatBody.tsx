"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { AskMessageList } from "@/modules/meetings/components/AskMessageList";
import { ASK_COPY, ASK_QUESTION_MAX_LENGTH } from "@/modules/meetings/constants";
import type { useAskChat } from "@/modules/meetings/use-ask-chat";
import { useCurrentUser } from "@/modules/settings/hooks";
import { AskFredComposer } from "@/shared/components/layout/AskFredComposer";

interface AskChatBodyProps {
  chat: ReturnType<typeof useAskChat>;
  /** Second line of the greeting, e.g. "Ask anything about this meeting". */
  headline: string;
  prompts: readonly string[];
  contextLabel: string;
  /** Jumps the player; omit when citations link elsewhere (cross-meeting chat). */
  onSeek?: (ms: number) => void;
  /** The panel header has its own "New chat", so it hides this link. */
  showClear?: boolean;
}

/** Greeting + suggested prompts → conversation → composer. Shared by the meeting and home panels. */
export function AskChatBody({
  chat,
  headline,
  prompts,
  contextLabel,
  onSeek,
  showClear = true,
}: AskChatBodyProps) {
  const { messages, isPending, errorView, send, retry, clear } = chat;
  const { data: user } = useCurrentUser();
  const name = user?.name ?? ASK_COPY.GREETING_FALLBACK_NAME;
  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty && (
          <div className="flex flex-col gap-3 px-6 pt-10">
            <Sparkles className="size-8 text-success" aria-hidden="true" />
            <h2 className="text-lg leading-snug font-semibold text-primary">
              Hi {name}!
              <br />
              {headline}
            </h2>
          </div>
        )}
        {(!isEmpty || isPending || errorView) && (
          <AskMessageList
            messages={messages}
            isPending={isPending}
            error={errorView}
            onRetry={retry}
            onSeek={onSeek}
          />
        )}
      </div>

      <div className="shrink-0 p-4">
        {isEmpty && (
          <ul className="mb-4 flex flex-col items-start gap-2">
            {prompts.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => send(prompt)}
                  disabled={isPending}
                  className="rounded-lg bg-card px-4 py-2 text-left text-sm text-default hover:bg-hover disabled:text-disabled"
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!isEmpty && showClear && (
          <button
            type="button"
            onClick={clear}
            className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {ASK_COPY.CLEAR}
          </button>
        )}
        <AskFredComposer
          variant="panel"
          onSend={send}
          contextLabel={contextLabel}
          disabled={isPending}
          maxLength={ASK_QUESTION_MAX_LENGTH}
        />
      </div>
    </div>
  );
}
