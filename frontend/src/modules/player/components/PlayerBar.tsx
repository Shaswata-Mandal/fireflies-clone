/**
 * Bottom player bar.
 *
 * WHAT: Seek bar, time label, speed menu, skip back/forward and play/pause.
 * LAYER: Module component (client).
 * CALLED BY: `MeetingDetailLayout`.
 * CALLS: `usePlayer`, `SeekBar`, `PlayerTimeLabel`, `PlaybackSpeedMenu`, `usePlayerHotkeys`.
 */

"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { SKIP_MS } from "@/modules/player/constants";
import { usePlayer } from "@/modules/player/hooks";
import { PlaybackSpeedMenu } from "@/modules/player/components/PlaybackSpeedMenu";
import { PlayerTimeLabel } from "@/modules/player/components/PlayerTimeLabel";
import { SeekBar } from "@/modules/player/components/SeekBar";
import { usePlayerHotkeys } from "@/modules/player/use-player-hotkeys";

const SKIP_SECONDS = SKIP_MS / 1000;
const ICON_BUTTON_CLASS =
  "flex size-9 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary disabled:text-player-icon-disabled disabled:hover:bg-transparent";

/**
 * Bottom bar from 17/21: seek track along the top edge, time on the left, transport in the centre.
 * Re-renders only on play/pause/speed changes; the time label and seek bar subscribe to time
 * themselves.
 */
export function PlayerBar() {
  // `usePlayer()` does NOT re-render on time ticks, so this bar only updates on play/pause/speed.
  const { isPlaying, durationMs, mediaUrl, toggle, skip } = usePlayer();
  const isDisabled = durationMs <= 0;
  usePlayerHotkeys(toggle, !isDisabled);

  return (
    <section aria-label="Player" className="shrink-0 border-t bg-page">
      {/* Pulled up so the 2px track sits on the bar's top border, like the screenshots. */}
      <div className="-mt-2">
        <SeekBar />
      </div>

      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <PlayerTimeLabel />

        <div className="flex items-center gap-1 sm:gap-3">
          <PlaybackSpeedMenu disabled={isDisabled} />
          <button
            type="button"
            aria-label={`Back ${SKIP_SECONDS} seconds`}
            disabled={isDisabled}
            onClick={() => skip(-SKIP_MS)}
            className={ICON_BUTTON_CLASS}
          >
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={isDisabled}
            onClick={toggle}
            className="flex h-8 w-12 items-center justify-center rounded-full bg-primary-600 text-on-primary hover:bg-primary-700 disabled:bg-active disabled:text-player-icon-disabled"
          >
            {isPlaying ? (
              <Pause className="size-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="size-4 fill-current" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
            disabled={isDisabled}
            onClick={() => skip(SKIP_MS)}
            className={ICON_BUTTON_CLASS}
          >
            <RotateCw className="size-5" aria-hidden="true" />
          </button>
        </div>

        {!mediaUrl && (
          <p className="hidden justify-self-end text-xs text-muted md:block">
            No recording · simulated playback
          </p>
        )}
      </div>
    </section>
  );
}
