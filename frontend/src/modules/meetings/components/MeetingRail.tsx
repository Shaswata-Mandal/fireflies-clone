"use client";

import { AudioLines, Bookmark, MessageCircle, Search, Smile } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/shared/components/IconButton";
import { showComingSoon } from "@/shared/utils/coming-soon";
import { cn } from "@/shared/utils/cn";

interface MeetingRailProps {
  isSearchOpen: boolean;
  onToggleSearch: () => void;
}

interface RailItem {
  label: string;
  icon: ReactNode;
}

// Soundbites / Discussion / Bookmarks are shown in 24–26 but are out of scope ("Coming soon").
const PLACEHOLDER_ITEMS: RailItem[] = [
  { label: "Soundbites", icon: <AudioLines /> },
  { label: "Discussion", icon: <MessageCircle /> },
  { label: "Bookmarks", icon: <Bookmark /> },
];

/** The slim icon column left of the meeting page (docs/reference/17); Smart Search is the live one. */
export function MeetingRail({ isSearchOpen, onToggleSearch }: MeetingRailProps) {
  return (
    <nav
      aria-label="Meeting tools"
      className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r bg-surface py-3 lg:flex"
    >
      <IconButton
        label="Smart Search"
        aria-pressed={isSearchOpen}
        onClick={onToggleSearch}
        className={cn("size-9", isSearchOpen && "bg-active text-primary-fg")}
      >
        <Search />
      </IconButton>
      {PLACEHOLDER_ITEMS.map(({ label, icon }) => (
        <IconButton
          key={label}
          label={label}
          onClick={() => showComingSoon(label)}
          className="size-9"
        >
          {icon}
        </IconButton>
      ))}
      <IconButton
        label="Send feedback"
        onClick={() => showComingSoon("Feedback")}
        className="mt-auto size-9"
      >
        <Smile />
      </IconButton>
    </nav>
  );
}
