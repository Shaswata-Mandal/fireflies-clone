"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { DEFAULT_PLAYBACK_RATE } from "@/modules/player/constants";
import type { ClockOptions, PlayerEngine } from "@/modules/player/types";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";

interface SimulatedClockOptions extends ClockOptions {
  durationMs: number;
}

/**
 * A fake playhead for meetings without a recording (`media_url` is null). Each animation frame
 * advances the time by the real time elapsed × playback rate, so 2× really runs twice as fast and
 * a throttled background tab catches up instead of drifting. Stops at the end like a media element.
 */
export function useSimulatedClock({
  store,
  durationMs,
  onPlayingChange,
}: SimulatedClockOptions): PlayerEngine {
  const durationRef = useLatestRef(durationMs);
  const onPlayingChangeRef = useLatestRef(onPlayingChange);
  const frameRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number | null>(null);
  const rateRef = useRef(DEFAULT_PLAYBACK_RATE);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    lastFrameAtRef.current = null;
  }, []);

  const engine = useMemo<PlayerEngine>(() => {
    function tick(now: number) {
      // The first frame after play() only records a starting point (elapsed = 0).
      const elapsed = now - (lastFrameAtRef.current ?? now);
      lastFrameAtRef.current = now;

      const next = Math.min(store.getTimeMs() + elapsed * rateRef.current, durationRef.current);
      store.setTimeMs(next);

      if (next >= durationRef.current) {
        stop();
        onPlayingChangeRef.current(false);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    return {
      play() {
        if (durationRef.current <= 0 || frameRef.current !== null) return;
        // Like <video>: play() at the very end starts over.
        if (store.getTimeMs() >= durationRef.current) store.setTimeMs(0);
        frameRef.current = requestAnimationFrame(tick);
        onPlayingChangeRef.current(true);
      },
      pause() {
        stop();
        onPlayingChangeRef.current(false);
      },
      seek(ms) {
        // The running loop reads the store each frame, so it simply continues from here.
        store.setTimeMs(ms);
      },
      setPlaybackRate(rate) {
        rateRef.current = rate;
      },
    };
  }, [store, stop, durationRef, onPlayingChangeRef]);

  // Unmount (navigating away) cancels the loop.
  useEffect(() => stop, [stop]);

  return engine;
}
