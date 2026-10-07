/**
 * Deep link to a moment (`?t=<ms>`).
 *
 * WHAT: On first load, moves the playhead to the time in the URL.
 * LAYER: Module hook (client).
 * CALLED BY: `MeetingDetailLayout`.
 * CALLS: `useSearchParams` (Next.js), `usePlayer`, `parseTimeParam`.
 * USED BY: citation chips in AskFred answers link to `/meetings/{id}?t=...`.
 */

"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { TIME_QUERY_PARAM } from "@/modules/player/constants";
import { usePlayer } from "@/modules/player/hooks";
import { parseTimeParam } from "@/modules/player/utils";

/**
 * `/meetings/3?t=655000` → seek to 11:00 once `isReady` (data loaded, so the transcript can
 * scroll to the line). Seeks without playing: autoplay would surprise the user and browsers block
 * it anyway. Runs once per page visit, so later re-renders don't yank the playhead back.
 */
export function useDeepLinkSeek(isReady: boolean): void {
  const searchParams = useSearchParams();
  const { seek } = usePlayer();
  // INTERVIEW: a ref is the right tool for a "did this already run?" flag. Changing a ref does not
  // re-render, and it survives re-renders, so the seek happens exactly once per page visit.
  const hasSeekedRef = useRef(false);

  useEffect(() => {
    if (!isReady || hasSeekedRef.current) return;
    hasSeekedRef.current = true;
    const ms = parseTimeParam(searchParams.get(TIME_QUERY_PARAM));
    if (ms !== null) seek(ms);
  }, [isReady, searchParams, seek]);
}
