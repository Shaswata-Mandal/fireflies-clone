"use client";

import { PLAYBACK_RATES } from "@/modules/player/constants";
import { usePlayer } from "@/modules/player/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface PlaybackSpeedMenuProps {
  disabled: boolean;
}

/** "1×" button (17) opening a radio list of speeds. Not captured in the screenshots: designed to
 * match the other menus (bg-surface, border-default). */
export function PlaybackSpeedMenu({ disabled }: PlaybackSpeedMenuProps) {
  const { playbackRate, setPlaybackRate } = usePlayer();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Playback speed, ${playbackRate}×`}
        className="flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-sm font-medium text-secondary tabular-nums hover:bg-hover disabled:text-player-icon-disabled data-[state=open]:bg-hover"
      >
        {playbackRate}×
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="center"
        className="w-36 border border-default bg-surface p-1.5 ring-0"
      >
        <DropdownMenuLabel className="px-2 text-xs text-muted">Playback speed</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(playbackRate)}
          onValueChange={(value) => setPlaybackRate(Number(value))}
        >
          {PLAYBACK_RATES.map((rate) => (
            <DropdownMenuRadioItem
              key={rate}
              value={String(rate)}
              className="h-8 text-sm text-default tabular-nums"
            >
              {rate === 1 ? "Normal" : `${rate}×`}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
