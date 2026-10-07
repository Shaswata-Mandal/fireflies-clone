import { AskCitationChips } from "@/modules/meetings/components/AskCitationChips";
import { ASK_COPY } from "@/modules/meetings/constants";
import type { AskChatMessage } from "@/modules/meetings/use-ask-chat";
import { FredMark } from "@/shared/components/FredMark";

interface AskMessageBubbleProps {
  message: AskChatMessage;
  onSeek?: (ms: number) => void;
}

/** One chat turn (docs/reference/23): a name row, then the text. Plain text with line breaks. */
export function AskMessageBubble({ message, onSeek }: AskMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary-subtle text-xs text-primary-fg">
          {isUser ? ASK_COPY.YOU.charAt(0) : <FredMark className="size-4" />}
        </span>
        {isUser ? ASK_COPY.YOU : ASK_COPY.ASSISTANT}
      </div>
      <p className="text-sm leading-6 break-words whitespace-pre-wrap text-default">
        {message.content}
      </p>
      {!isUser && <AskCitationChips citations={message.citations} onSeek={onSeek} />}
    </li>
  );
}
