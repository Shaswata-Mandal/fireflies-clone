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
