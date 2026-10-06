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
}

/** Message box shared by the dock and the panel. Enter sends, Shift+Enter adds a line. */
export function AskFredComposer({ variant, onSend }: AskFredComposerProps) {
  const [message, setMessage] = useState("");
  const isPanel = variant === "panel";
  const canSend = message.trim().length > 0;

  function send() {
    if (!canSend) return;
    onSend(message.trim());
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    send();
  }

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
          {ASKFRED_CONTEXT_LABEL}
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
