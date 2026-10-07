"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  DEFAULT_NOTES_TAB,
  NOTES_TAB_PARAM,
  parseNotesTab,
  type NotesTabId,
} from "@/modules/meetings/notes-tabs";

/**
 * Selected notes tab, stored in `?tab=` so reloads and shared links reopen it. `replace`, not
 * `push`: arrow keys switch tabs one by one, and each step shouldn't become a Back-button entry.
 * Other params (the `?t=` deep link) are kept; the default tab is left out of the URL.
 */
export function useNotesTab(): [NotesTabId, (tab: NotesTabId) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseNotesTab(searchParams.get(NOTES_TAB_PARAM));

  const setActiveTab = useCallback(
    (tab: NotesTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === DEFAULT_NOTES_TAB) params.delete(NOTES_TAB_PARAM);
      else params.set(NOTES_TAB_PARAM, tab);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return [activeTab, setActiveTab];
}
