/**
 * The player's owner: state, clocks and the two contexts.
 *
 * WHAT: Creates the time store, runs BOTH clock hooks, picks the right engine, and exposes one
 *   stable API (`play`, `pause`, `toggle`, `seek`, `skip`, speed) to the whole meeting page.
 * LAYER: Module component / provider (client).
 * CALLED BY: `MeetingDetailView`, once per meeting page.
 * CALLS: `useSimulatedClock`, `useMediaElementClock`, `createTimeStore`.
 * MERN EQUIVALENT: a `<PlayerProvider>` that wraps `useReducer` + `<audio>` logic and shares it
 *   through Context.
 * INTERVIEW: CLAUDE.md says the provider owns `currentTimeMs`. The implementation goes one step
 * further: time lives in an external store (not React state) so a 60 fps clock does not re-render
 * the whole transcript. Be ready to explain this documented deviation.
 */

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
  // (`createTimeStore` is passed, not called, so React runs it only on the first render.)
  const [store] = useState(createTimeStore);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setRate] = useState(DEFAULT_PLAYBACK_RATE);
  const [mediaDurationMs, setMediaDurationMs] = useState<number | null>(null);
  // The element is kept in STATE (not a ref) on purpose: when it mounts, the clock's effect must
  // re-run to attach its listeners, and only a state change triggers that.
  const [mediaElement, setMediaElement] = useState<HTMLMediaElement | null>(null);

  // Prefer the real file length once known; until then use the meeting's stored duration.
  const effectiveDurationMs = mediaDurationMs ?? durationMs;
  const durationRef = useLatestRef(effectiveDurationMs);
  // Read by toggle(), which must not change identity on every play/pause.
  const isPlayingRef = useRef(false);

  // Keeps the ref and the state in step: the ref is for `toggle` (no re-render), the state is
  // for the UI (play/pause icon).
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

  // The functions below are wrapped in useCallback so their identity is stable; consumers such as
  // memoised outline rows would otherwise re-render whenever the provider does.
  const play = useCallback(() => engine.play(), [engine]);
  const pause = useCallback(() => engine.pause(), [engine]);
  const toggle = useCallback(
    () => (isPlayingRef.current ? engine.pause() : engine.play()),
    [engine],
  );
  // `seek` clamps to [0, duration] here, so neither clock has to worry about out-of-range values.
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

  // The context value is memoised: it only changes when playing state, speed or duration change,
  // never because the clock ticked.
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

  // `store` never changes identity, so PlayerTimeContext never triggers a re-render by itself.
  return (
    <PlayerTimeContext.Provider value={store}>
      <PlayerContext.Provider value={api}>{children}</PlayerContext.Provider>
    </PlayerTimeContext.Provider>
  );
}
