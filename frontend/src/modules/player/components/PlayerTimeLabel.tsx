/**
 * "00:08 / 02:06" time text.
 *
 * WHAT: Shows the current and total time.
 * LAYER: Module component (client).
 * CALLED BY: `PlayerBar`.
 * CALLS: `usePlayerTimeMs`, `formatTimestamp`.
 * INTERVIEW: a tiny component of its own, so the 10 re-renders per second affect only this text.
 */

"use client";

import { usePlayer, usePlayerTimeMs } from "@/modules/player/hooks";
import { formatTimestamp } from "@/shared/utils/format-time";

/** "00:08 / 02:06" (17). Its own component so only this text re-renders as time passes. */
export function PlayerTimeLabel() {
  const { durationMs } = usePlayer();
  const timeMs = usePlayerTimeMs();

  return (
    <p className="text-sm tabular-nums">
      <span className="font-medium text-primary">{formatTimestamp(timeMs)}</span>
      <span className="text-muted"> / {formatTimestamp(durationMs)}</span>
    </p>
  );
}
