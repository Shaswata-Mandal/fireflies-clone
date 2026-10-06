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
  const hasSeekedRef = useRef(false);

  useEffect(() => {
    if (!isReady || hasSeekedRef.current) return;
    hasSeekedRef.current = true;
    const ms = parseTimeParam(searchParams.get(TIME_QUERY_PARAM));
    if (ms !== null) seek(ms);
  }, [isReady, searchParams, seek]);
}
