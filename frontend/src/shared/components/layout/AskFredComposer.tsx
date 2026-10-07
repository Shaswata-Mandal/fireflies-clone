/**
 * AskFred message box.
 *
 * WHAT: A form with a textarea, tool icons and a send button, in a compact "dock" or a roomier
 *   "panel" variant.
 * LAYER: Shared layout component (client: controlled input state).
 * CALLED BY: `AskFredDock` and the AskFred chat body.
 * CALLS: `IconButton`, `showComingSoon`, `askfred` constants.
 * MERN EQUIVALENT: a controlled chat input component.
 */

"use client";

import { ArrowUp, Hash, Layers, Mic, Plus } from "lucide-react";
import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { IconButton } from "@/shared/components/IconButton";
import { ASKFRED_CONTEXT_LABEL, ASKFRED_PLACEHOLDERS } from "@/shared/constants/askfred";
import { showComingSoon } from "@/shared/utils/coming-soon";
import { cn } from "@/shared/utils/cn";

interface AskFredComposerProps {
  /** "dock": single-line bar (07). "panel": context chip + multi-line box (06 / 15). */
  variant: "dock" | "panel";
  onSend: (message: string) => void;
  /** Panel chip text; defaults to the global "My Meetings" scope. */
  contextLabel?: string;
  /** Blocks sending (e.g. while an answer is loading) but keeps the text box editable. */
  disabled?: boolean;
  /** Max characters the box accepts; omitted = unlimited. */
  maxLength?: number;
}

/** Message box shared by the dock and the panel. Enter sends, Shift+Enter adds a line. */
// @param variant look; @param onSend called with the trimmed text; @param disabled blocks sending
export function AskFredComposer({
  variant,
  onSend,
  contextLabel = ASKFRED_CONTEXT_LABEL,
  disabled = false,
  maxLength,
}: AskFredComposerProps) {
  // Controlled input: React state is the single source of truth for the textarea's text.
  const [message, setMessage] = useState("");
  const isPanel = variant === "panel";
  const canSend = !disabled && message.trim().length > 0;

  // Shared by the form submit (button) and the Enter key.
  function send() {
    if (!canSend) return;
    onSend(message.trim());
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stops the browser's default form submit (a full page reload).
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter falls through so the textarea inserts a new line.
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    send();
  }

  // Tailwind: `focus-within:border-focus` highlights the whole box while the textarea has focus;
  // the panel variant stacks (`flex-col`), the dock variant is one row (`items-center`).
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex rounded-lg border bg-card focus-within:border-focus",
        isPanel ? "flex-col gap-2 p-3" : "items-center gap-1 py-1.5 pr-1.5 pl-3",
      )}
    >
      {isPanel && (
        <span className="flex w-fit items-center gap-1 rounded-md bg-hover px-2 py-1 text-sm text-default">
          <Hash className="size-3.5" aria-hidden="true" />
          {contextLabel}
        </span>
      )}
      <label className="sr-only" htmlFor={`askfred-input-${variant}`}>
        Message AskFred
      </label>
      <textarea
        id={`askfred-input-${variant}`}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={isPanel ? 2 : 1}
        maxLength={maxLength}
        placeholder={ASKFRED_PLACEHOLDERS[variant]}
        className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-6 text-default outline-none placeholder:text-muted"
      />
      <div className="flex items-center gap-1">
        {isPanel && (
          <IconButton label="Attach context" onClick={() => showComingSoon("Attachments")}>
            <Plus />
          </IconButton>
        )}
        <IconButton label="AI skills" onClick={() => showComingSoon("AI Skills")}>
          <Layers />
        </IconButton>
        <IconButton
          label="Voice input"
          onClick={() => showComingSoon("Voice input")}
          className={cn(isPanel && "ml-auto")}
        >
          <Mic />
        </IconButton>
        <button
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            canSend
              ? "bg-primary-600 text-on-primary hover:bg-primary-700"
              : "bg-primary-send text-primary-fg",
          )}
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
