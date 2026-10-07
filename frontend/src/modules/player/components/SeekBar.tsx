/**
 * The seek slider with a hover time bubble.
 *
 * WHAT: A native range input bound to the playhead; hover shows the time under the pointer.
 * LAYER: Module component (client).
 * CALLED BY: `PlayerBar`.
 * CALLS: `usePlayer`, `usePlayerTimeMs`, `formatTimestamp`.
 * MERN EQUIVALENT: a controlled `<input type="range">`.
 */

"use client";

import { useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { KEYBOARD_SEEK_MS } from "@/modules/player/constants";
import { usePlayer, usePlayerTimeMs } from "@/modules/player/hooks";
import { formatTimestamp } from "@/shared/utils/format-time";

interface HoverPosition {
  ms: number;
  percent: number;
}

const PERCENT = 100;

/**
 * Full-width scrubber on the player bar's top edge (17), with the hover time bubble from 22.
 * A native range input: role="slider", aria-valuenow/min/max, dragging, Home/End come for free.
 * ←/→ are overridden to jump 5 s (a native `step` would also snap drags to 5 s multiples).
 */
export function SeekBar() {
  const { durationMs, seek, skip } = usePlayer();
  const timeMs = usePlayerTimeMs();
  // Hover state is local UI state: where the pointer is on the bar, or null when it is outside.
  const [hover, setHover] = useState<HoverPosition | null>(null);

  const isDisabled = durationMs <= 0;
  const progress = isDisabled ? 0 : Math.min((timeMs / durationMs) * PERCENT, PERCENT);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    skip(event.key === "ArrowRight" ? KEYBOARD_SEEK_MS : -KEYBOARD_SEEK_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLInputElement>) {
    if (isDisabled) return;
    // Position of the pointer along the bar as a fraction 0..1 (clamped), then scaled to a time.
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setHover({ ms: ratio * durationMs, percent: ratio * PERCENT });
  }

  return (
    <div className="relative">
      {hover && (
        <span
          aria-hidden="true"
          style={{ left: `${hover.percent}%` }}
          className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 rounded-md bg-scrub-tooltip px-1.5 py-0.5 text-xs font-medium text-scrub-tooltip-fg tabular-nums"
        >
          {formatTimestamp(hover.ms)}
        </span>
      )}
      <input
        type="range"
        aria-label="Seek"
        aria-valuetext={`${formatTimestamp(timeMs)} of ${formatTimestamp(durationMs)}`}
        min={0}
        max={Math.max(durationMs, 0)}
        value={Math.min(timeMs, Math.max(durationMs, 0))}
        disabled={isDisabled}
        onChange={(event) => seek(Number(event.target.value))}
        onKeyDown={handleKeyDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
        // The fill percentage is data, so it goes in a CSS variable read by .seek-range.
        style={{ "--seek-progress": `${progress}%` } as CSSProperties}
        className="seek-range block w-full"
      />
    </div>
  );
}
