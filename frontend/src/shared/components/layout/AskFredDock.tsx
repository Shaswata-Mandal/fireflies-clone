"use client";

import { History, PanelRight } from "lucide-react";
import { useState } from "react";
import type { FocusEvent } from "react";
import { IconButton } from "@/shared/components/IconButton";
import { AskFredComposer } from "@/shared/components/layout/AskFredComposer";
import { DOCK_PROMPTS } from "@/shared/constants/askfred";
import { cn } from "@/shared/utils/cn";

interface AskFredDockProps {
  onAsk: (message: string) => void;
  onOpenPanel: () => void;
}

/** Floating composer at the bottom of Home while the panel is closed (docs/reference/07). */
export function AskFredDock({ onAsk, onOpenPanel }: AskFredDockProps) {
  // The prompt row only shows once the user clicks/focuses inside the dock, to keep Home uncluttered.
  const [isActive, setIsActive] = useState(false);

  function handleBlur(event: FocusEvent<HTMLElement>) {
    // Moving focus between children (e.g. textarea → a prompt button) must not collapse the row.
    if (!event.currentTarget.contains(event.relatedTarget)) setIsActive(false);
  }

  return (
    <section
      aria-label="Ask Fred"
      onFocus={() => setIsActive(true)}
      onBlur={handleBlur}
      // Frosted glass: translucent fill + blur so the content underneath is not legible through it.
      className="absolute inset-x-4 bottom-6 mx-auto flex max-w-155 flex-col gap-2 rounded-xl border bg-surface/95 p-2 shadow-lg backdrop-blur-2xl backdrop-saturate-150"
    >
      {isActive && (
        <div className="flex items-center gap-1.5">
          <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {DOCK_PROMPTS.map(({ label, icon: Icon, iconClassName }) => (
              <li key={label} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onAsk(label)}
                  className="flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-sm text-default hover:bg-active"
                >
                  <Icon className={cn("size-3.5", iconClassName)} aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
          {/* History lives in the panel header (15), so this opens the panel rather than duplicating it. */}
          <IconButton label="Chat history" onClick={onOpenPanel}>
            <History />
          </IconButton>
          <IconButton label="Open AskFred panel" onClick={onOpenPanel}>
            <PanelRight />
          </IconButton>
        </div>
      )}
      <AskFredComposer variant="dock" onSend={onAsk} />
    </section>
  );
}
