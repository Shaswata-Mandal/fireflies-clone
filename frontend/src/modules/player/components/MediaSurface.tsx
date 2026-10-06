"use client";

import { VideoOff } from "lucide-react";
import { usePlayer } from "@/modules/player/hooks";
import { isVideoUrl } from "@/modules/player/utils";
import { cn } from "@/shared/utils/cn";

interface MediaSurfaceProps {
  /** The header's "Video" toggle (21). */
  isVisible: boolean;
}

/**
 * The media element plus the video panel from 21. The <audio>/<video> stays mounted while the
 * panel is hidden, so hiding the video never stops or resets playback. Without a recording the
 * panel shows a placeholder and the simulated clock drives everything.
 */
export function MediaSurface({ isVisible }: MediaSurfaceProps) {
  const { mediaUrl, registerMediaElement } = usePlayer();

  if (!mediaUrl) {
    if (!isVisible) return null;
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border bg-card px-6 text-center">
        <VideoOff className="size-8 text-muted" aria-hidden="true" />
        <p className="text-sm font-medium text-primary">No recording for this meeting</p>
        <p className="max-w-xs text-sm text-muted">
          Playback is simulated, so the transcript still follows the player.
        </p>
      </div>
    );
  }

  if (!isVideoUrl(mediaUrl)) {
    // Audio has nothing to show; it only needs to exist.
    return <audio ref={registerMediaElement} src={mediaUrl} preload="metadata" />;
  }

  return (
    <div className={cn("w-full overflow-hidden rounded-lg bg-black", !isVisible && "hidden")}>
      {/* No native controls: the PlayerBar is the single set of controls. */}
      <video
        ref={registerMediaElement}
        src={mediaUrl}
        preload="metadata"
        playsInline
        className="aspect-video w-full"
      />
    </div>
  );
}
