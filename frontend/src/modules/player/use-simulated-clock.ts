/**
 * Fake clock for meetings without a recording.
 *
 * WHAT: Advances the playhead with `requestAnimationFrame`, using real elapsed time so speed
 *   changes and slow frames stay accurate.
 * LAYER: Module hook (client).
 * CALLED BY: `PlayerProvider` (used when `media_url` is null, e.g. the seeded meetings).
 * CALLS: `useLatestRef`, the browser's animation-frame API.
 * INTERVIEW: this is why the demo works with no audio files. It implements the same
 * `PlayerEngine` interface as the real-media clock, so the rest of the app cannot tell the
 * difference.
 */

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
  // All of these are refs because the `tick` function below runs ~60x a second outside React's
  // render cycle and must read current values without re-creating itself, and none of them
  // should cause a re-render when they change.
  const durationRef = useLatestRef(durationMs);
  const onPlayingChangeRef = useLatestRef(onPlayingChange);
  // The pending animation-frame id (null = not playing).
  const frameRef = useRef<number | null>(null);
  // Timestamp of the previous frame, used to measure how much real time has passed.
  const lastFrameAtRef = useRef<number | null>(null);
  const rateRef = useRef(DEFAULT_PLAYBACK_RATE);

  // Cancels the loop. useCallback keeps `stop` the same function across renders.
  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    lastFrameAtRef.current = null;
  }, []);

  const engine = useMemo<PlayerEngine>(() => {
    // INTERVIEW: `tick` is the rAF callback. The browser passes `now`, a high-resolution timestamp
    // in ms. Advancing by (now - previous frame) * rate, rather than "+16 ms per frame", keeps
    // the time correct even if a frame is late or the tab was throttled.
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

  // Unmount (navigating away) cancels the loop. Returning `stop` from the effect makes it the
  // cleanup function, so no frame keeps running after the page is gone.
  useEffect(() => stop, [stop]);

  return engine;
}
