"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_PLAYBACK_RATE } from "@/modules/player/constants";
import { PlayerContext, PlayerTimeContext } from "@/modules/player/context";
import { createTimeStore } from "@/modules/player/time-store";
import type { PlayerApi } from "@/modules/player/types";
import { useMediaElementClock } from "@/modules/player/use-media-element-clock";
import { useSimulatedClock } from "@/modules/player/use-simulated-clock";
import { clampTime } from "@/modules/player/utils";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";

interface PlayerProviderProps {
  /** The meeting's length; used until (or instead of) the media file's own metadata. */
  durationMs: number;
  mediaUrl: string | null;
  children: ReactNode;
}

/**
 * Single owner of playback for one meeting page. Picks the real-media or simulated clock and
 * exposes the same API either way. Mounted by the page, so navigating away unmounts it and the
 * clocks' cleanups pause playback.
 */
export function PlayerProvider({ durationMs, mediaUrl, children }: PlayerProviderProps) {
  // Lazy init: one store for the provider's whole life.
  const [store] = useState(createTimeStore);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setRate] = useState(DEFAULT_PLAYBACK_RATE);
  const [mediaDurationMs, setMediaDurationMs] = useState<number | null>(null);
  const [mediaElement, setMediaElement] = useState<HTMLMediaElement | null>(null);

  const effectiveDurationMs = mediaDurationMs ?? durationMs;
  const durationRef = useLatestRef(effectiveDurationMs);
  // Read by toggle(), which must not change identity on every play/pause.
  const isPlayingRef = useRef(false);

  const handlePlayingChange = useCallback((playing: boolean) => {
    isPlayingRef.current = playing;
    setIsPlaying(playing);
  }, []);

  const simulated = useSimulatedClock({
    store,
    durationMs: effectiveDurationMs,
    onPlayingChange: handlePlayingChange,
  });
  const media = useMediaElementClock({
    element: mediaElement,
    store,
    onPlayingChange: handlePlayingChange,
    onDurationChange: setMediaDurationMs,
  });
  // Both hooks always run (hooks can't be conditional); only the chosen one is ever driven.
  const engine = mediaUrl ? media : simulated;

  const play = useCallback(() => engine.play(), [engine]);
  const pause = useCallback(() => engine.pause(), [engine]);
  const toggle = useCallback(
    () => (isPlayingRef.current ? engine.pause() : engine.play()),
    [engine],
  );
  const seek = useCallback(
    (ms: number) => engine.seek(clampTime(ms, durationRef.current)),
    [engine, durationRef],
  );
  const skip = useCallback(
    (deltaMs: number) => engine.seek(clampTime(store.getTimeMs() + deltaMs, durationRef.current)),
    [engine, store, durationRef],
  );
  const setPlaybackRate = useCallback(
    (rate: number) => {
      // Tell both clocks, so switching source later keeps the chosen speed.
      simulated.setPlaybackRate(rate);
      media.setPlaybackRate(rate);
      setRate(rate);
    },
    [simulated, media],
  );

  const api = useMemo<PlayerApi>(
    () => ({
      isPlaying,
      durationMs: effectiveDurationMs,
      playbackRate,
      mediaUrl,
      play,
      pause,
      toggle,
      seek,
      skip,
      setPlaybackRate,
      registerMediaElement: setMediaElement,
    }),
    [
      isPlaying,
      effectiveDurationMs,
      playbackRate,
      mediaUrl,
      play,
      pause,
      toggle,
      seek,
      skip,
      setPlaybackRate,
    ],
  );

  return (
    <PlayerTimeContext.Provider value={store}>
      <PlayerContext.Provider value={api}>{children}</PlayerContext.Provider>
    </PlayerTimeContext.Provider>
  );
}
