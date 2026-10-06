"use client";

import { Bot, Hash, LibraryBig, Plus, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { MEETING_VIEW_LABELS, MEETING_VIEWS, type MeetingView } from "@/modules/meetings/constants";
import { ROUTES } from "@/shared/constants/routes";
import { cn } from "@/shared/utils/cn";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface MeetingsTabsProps {
  view: MeetingView;
  onChange: (view: MeetingView) => void;
  /** `panel` = the 09/13 channel column (desktop); `bar` = segmented tabs for narrow screens. */
  variant: "panel" | "bar";
}

const VIEW_ICONS: Record<MeetingView, LucideIcon> = {
  [MEETING_VIEWS.MINE]: Hash,
  [MEETING_VIEWS.ALL]: LibraryBig,
};

const VIEWS = [MEETING_VIEWS.MINE, MEETING_VIEWS.ALL] as const;
const VOICE_AGENT_LABEL = "Voice Agent Meetings";
const ITEM_CLASS =
  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-default hover:bg-hover";

/** "My Meetings / All Meetings" switch. Both list the same meetings (no sharing model yet). */
export function MeetingsTabs({ view, onChange, variant }: MeetingsTabsProps) {
  const [channelQuery, setChannelQuery] = useState("");

  if (variant === "bar") {
    return (
      <nav aria-label="Meeting channels" className="flex gap-1 border-b px-4 py-2 lg:hidden">
        {VIEWS.map((option) => (
          <button
            key={option}
            type="button"
            aria-current={view === option ? "page" : undefined}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm text-secondary hover:bg-hover",
              view === option &&
                "bg-primary-subtle font-medium text-primary-fg hover:bg-primary-subtle",
            )}
          >
            {MEETING_VIEW_LABELS[option]}
          </button>
        ))}
      </nav>
    );
  }

  const needle = channelQuery.trim().toLowerCase();
  const matches = (label: string) => label.toLowerCase().includes(needle);

  return (
    <aside className="hidden w-62.5 shrink-0 flex-col border-r lg:flex">
      <div className="border-b p-3">
        <label className="flex h-9 items-center gap-2 rounded-md border border-strong bg-card px-2.5 focus-within:border-focus">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only">Search channels</span>
          <input
            type="search"
            value={channelQuery}
            onChange={(event) => setChannelQuery(event.target.value)}
            placeholder="Search channels"
            className="min-w-0 flex-1 bg-transparent text-sm text-default outline-none placeholder:text-muted"
          />
        </label>
      </div>

      <nav aria-label="Meeting channels" className="flex flex-col gap-1 border-b p-3">
        {VIEWS.filter((option) => matches(MEETING_VIEW_LABELS[option])).map((option) => {
          const Icon = VIEW_ICONS[option];
          const isActive = view === option;
          return (
            <button
              key={option}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(option)}
              className={cn(
                ITEM_CLASS,
                isActive && "bg-primary-subtle font-medium text-primary-fg hover:bg-primary-subtle",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {MEETING_VIEW_LABELS[option]}
            </button>
          );
        })}
        {matches(VOICE_AGENT_LABEL) && (
          <button
            type="button"
            onClick={() => showComingSoon(VOICE_AGENT_LABEL)}
            className={ITEM_CLASS}
          >
            <Bot className="size-4 shrink-0" aria-hidden="true" />
            {VOICE_AGENT_LABEL}
          </button>
        )}
        {matches("Uploads") && (
          <Link href={ROUTES.UPLOADS} className={ITEM_CLASS}>
            <Upload className="size-4 shrink-0" aria-hidden="true" />
            Uploads
            <span className="rounded bg-success-subtle px-1.5 py-0.5 text-xs font-medium text-success">
              NEW
            </span>
          </Link>
        )}
      </nav>

      <section className="flex flex-col items-center gap-3 px-4 py-5 text-center">
        <h2 className="self-start px-2 text-sm text-default">All channels</h2>
        <Hash className="size-6 text-primary-fg" aria-hidden="true" />
        <p className="text-sm text-default">Create channels to organize your conversations</p>
        <button
          type="button"
          onClick={() => showComingSoon("Channels")}
          className="flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-sm text-default hover:bg-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          Channel
        </button>
      </section>
    </aside>
  );
}
