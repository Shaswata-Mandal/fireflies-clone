"use client";

import { Sparkles } from "lucide-react";
import { useCurrentUser } from "@/modules/settings/hooks";
import { PANEL_PROMPTS } from "@/shared/constants/askfred";
import { cn } from "@/shared/utils/cn";

interface AskFredEmptyStateProps {
  onPrompt: (prompt: string) => void;
}

const FALLBACK_GREETING_NAME = "there";

/** Greeting + suggested prompts (docs/reference/06). Reuses the cached `/me` query for the name. */
export function AskFredEmptyState({ onPrompt }: AskFredEmptyStateProps) {
  const { data: user } = useCurrentUser();
  const name = user?.name ?? FALLBACK_GREETING_NAME;

  return (
    <div className="flex flex-col gap-10 px-6 pt-20">
      <div className="flex flex-col gap-5">
        <Sparkles className="size-8 text-success" aria-hidden="true" />
        <h2 className="text-lg leading-snug font-semibold text-primary">
          Hi {name}!
          <br />
          Get ready for your meeting
        </h2>
      </div>
      <ul className="flex flex-col items-start gap-3">
        {PANEL_PROMPTS.map(({ label, icon: Icon, iconClassName }) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => onPrompt(label)}
              className="flex items-center gap-3 rounded-lg bg-card px-4 py-2.5 text-left text-sm text-default hover:bg-hover"
            >
              <Icon className={cn("size-4 shrink-0", iconClassName)} aria-hidden="true" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
