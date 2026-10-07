/**
 * Chat state for the AskFred assistant.
 *
 * WHAT: Keeps the message list in React state, sends questions through `useAskMeeting`, and
 *   exposes send / retry / clear plus a ready-made error view.
 * LAYER: Module hook (UI state built on a mutation; the messages are NOT server state).
 * CALLED BY: `AppShell` (global chat) and `AskMeetingPanel` (one meeting).
 * CALLS: `useAskMeeting`, `describeAskError`.
 * MERN EQUIVALENT: a `useChat` custom hook with `messages`, `sendMessage`, `retry`.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { describeAskError, type AskErrorView } from "@/modules/meetings/ask-errors";
import { ASK_HISTORY_LIMIT } from "@/modules/meetings/constants";
import { useAskMeeting } from "@/modules/meetings/hooks";
import type { AskBody, AskCitation, AskRole } from "@/modules/meetings/types";

export interface AskChatMessage {
  id: number;
  role: AskRole;
  content: string;
  citations: AskCitation[];
}

/**
 * Chat state for an AskFred panel (one meeting, or all meetings when `meetingId` is null). Messages live in component state only: a refresh
 * starts a new chat, which is all the assignment needs.
 */
export function useAskChat(meetingId: number | null) {
  const mutation = useAskMeeting(meetingId);
  const [messages, setMessages] = useState<AskChatMessage[]>([]);
  // useRef (not useState) for the id counter: it must survive renders but never trigger one.
  const nextId = useRef(0);

  const append = useCallback((role: AskRole, content: string, citations: AskCitation[] = []) => {
    nextId.current += 1;
    setMessages((previous) => [...previous, { id: nextId.current, role, content, citations }]);
  }, []);

  // `mutate` has a stable identity, so destructuring it keeps `submit` stable for useCallback.
  const { mutate } = mutation;
  const submit = useCallback(
    (body: AskBody) => {
      // Per-call callback: it is dropped if the chat is cleared (reset) while the request is out.
      mutate(body, { onSuccess: (data) => append("assistant", data.answer, data.citations) });
    },
    [mutate, append],
  );

  // @param question the user's text. Ignored while an answer is still loading.
  function send(question: string) {
    if (mutation.isPending) return;
    // Only the last few turns go to the server as context (the backend caps it as well).
    const history = messages
      .slice(-ASK_HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));
    append("user", question);
    submit({ question, history });
  }

  /** Re-sends exactly what failed; the question is already in the list, so nothing is appended. */
  function retry() {
    if (mutation.isPending || !mutation.variables) return;
    submit(mutation.variables);
  }

  // Resets the mutation too, so an old error or pending result does not leak into the new chat.
  function clear() {
    mutation.reset();
    setMessages([]);
  }

  const errorView: AskErrorView | null = mutation.isError ? describeAskError(mutation.error) : null;

  return { messages, isPending: mutation.isPending, errorView, send, retry, clear };
}
