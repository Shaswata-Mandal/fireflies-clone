"use client";

import { MessageSquare, Search } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";

/** Chat history dropdown (docs/reference/15). No chats are stored yet, so it is always empty. */
export function AskFredHistoryPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton label="Chat history">
          <MessageSquare />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(28rem,calc(100vw-2rem))] gap-0 bg-surface p-0">
        <label className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="size-4 text-muted" aria-hidden="true" />
          <span className="sr-only">Search history</span>
          <input
            type="search"
            placeholder="Search History"
            className="min-w-0 flex-1 bg-transparent text-sm text-default outline-none placeholder:text-muted"
          />
        </label>
        <p className="px-4 py-6 text-center text-sm text-tertiary">No history yet</p>
      </PopoverContent>
    </Popover>
  );
}
