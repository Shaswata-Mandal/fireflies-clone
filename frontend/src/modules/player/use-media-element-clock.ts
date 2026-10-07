/**
 * Clock driven by a real <audio> / <video> element.
 *
 * WHAT: Listens to the element's events and, while it plays, copies `currentTime` into the time
 *   store on every animation frame so the transcript can follow line by line.
 * LAYER: Module hook (client; talks to the DOM, not to React state).
 * CALLED BY: `PlayerProvider` (used when the meeting has a `media_url`).
 * CALLS: `useLatestRef`, the browser's media and animation-frame APIs.
 * MERN EQUIVALENT: a `useAudio` hook around `new Audio()` with a `requestAnimationFrame` poller.
 * INTERVIEW: the media element is the source of truth. We never assume `play()` worked: React
 * state changes in response to the element's own `play` / `pause` events.
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_PLAYBACK_RATE } from "@/modules/player/constants";
import type { ClockOptions, PlayerEngine } from "@/modules/player/types";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";

const MS_PER_SECOND = 1000;

// DOM writes live in plain functions: the React Compiler lint treats hook arguments as immutable,
// but an HTMLMediaElement is an imperative handle that must be written to.
/** Sets the element's speed (a plain function so the lint rule about mutating hook args stays quiet). */
function applyPlaybackRate(media: HTMLMediaElement, rate: number): void {
  media.playbackRate = rate;
}

/** Moves the element's playhead; the DOM wants seconds, the app uses milliseconds. */
function applyCurrentTime(media: HTMLMediaElement, ms: number): void {
  media.currentTime = ms / MS_PER_SECOND;
}

interface MediaElementClockOptions extends ClockOptions {
  element: HTMLMediaElement | null;
  /** The file's real length once metadata loads (may differ from the meeting's duration_ms). */
  onDurationChange: (durationMs: number) => void;
}

/**
 * Drives a real <audio>/<video>. The element is the source of truth: React state follows its
 * play/pause events rather than assuming a call succeeded (autoplay rules can reject play()).
 * `timeupdate` only fires ~4×/s, too coarse for line-by-line sync, so while playing an rAF loop
 * copies `currentTime` into the store every frame.
 */
export function useMediaElementClock({
  element,
  store,
  onPlayingChange,
  onDurationChange,
}: MediaElementClockOptions): PlayerEngine {
  // INTERVIEW: refs vs state. These "latest ref" values are read INSIDE event listeners and the
  // animation loop, which are created once. A plain prop or state value captured in them would be
  // stale (a "stale closure"). A ref always holds the newest value and changing it never causes
  // a re-render, so the listeners below are attached once, not on every render.
  const elementRef = useLatestRef(element);
  const onPlayingChangeRef = useLatestRef(onPlayingChange);
  const onDurationChangeRef = useLatestRef(onDurationChange);
  // Remembered so a rate picked before the element mounts is applied when it does.
  const rateRef = useRef(DEFAULT_PLAYBACK_RATE);

  // This effect runs when the <audio>/<video> element appears (or changes) and sets up everything
  // that depends on it. Its returned cleanup removes the listeners and stops the loop.
  useEffect(() => {
    if (!element) return;
    // The id of the pending animation frame, or null when no loop is running.
    let frame: number | null = null;
    applyPlaybackRate(element, rateRef.current);

    const syncTime = () => store.setTimeMs(element.currentTime * MS_PER_SECOND);
    // INTERVIEW: the rAF loop. `requestAnimationFrame(fn)` asks the browser to call `fn` right
    // before the next screen repaint (about 60 times a second, paused in background tabs). The
    // function re-schedules itself, which makes a loop that is synchronised with the display.
    // We need it because the element's `timeupdate` event only fires about 4 times a second.
    const loop = () => {
      syncTime();
      frame = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    // `play` event: the element really started, so tell React and start the frame loop.
    const handlePlay = () => {
      onPlayingChangeRef.current(true);
      if (frame === null) frame = requestAnimationFrame(loop);
    };
    // Also fires right before `ended`, so one handler covers both.
    const handlePause = () => {
      stopLoop();
      syncTime();
      onPlayingChangeRef.current(false);
    };
    const handleMetadata = () => {
      if (Number.isFinite(element.duration)) {
        onDurationChangeRef.current(element.duration * MS_PER_SECOND);
      }
    };

    // `seeked` = the browser finished a jump; `loadedmetadata` = the real duration is known.
    element.addEventListener("play", handlePlay);
    element.addEventListener("pause", handlePause);
    element.addEventListener("seeked", syncTime);
    element.addEventListener("loadedmetadata", handleMetadata);
    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) handleMetadata();

    // Cleanup: runs before the effect re-runs and on unmount. Always remove what you added.
    return () => {
      element.removeEventListener("play", handlePlay);
      element.removeEventListener("pause", handlePause);
      element.removeEventListener("seeked", syncTime);
      element.removeEventListener("loadedmetadata", handleMetadata);
      stopLoop();
      element.pause();
    };
  }, [element, store, onPlayingChangeRef, onDurationChangeRef]);

  // useMemo keeps the engine object identical between renders (the provider lists it in
  // dependency arrays). The methods only touch refs, so they never go stale.
  return useMemo<PlayerEngine>(
    () => ({
      play() {
        // Rejects on autoplay policy or a broken file; the UI must not stay in "playing".
        elementRef.current?.play().catch(() => onPlayingChangeRef.current(false));
      },
      pause() {
        elementRef.current?.pause();
      },
      seek(ms) {
        if (elementRef.current) applyCurrentTime(elementRef.current, ms);
        // Update now; `seeked` arrives after the browser has buffered the new position.
        store.setTimeMs(ms);
      },
      setPlaybackRate(rate) {
        rateRef.current = rate;
        if (elementRef.current) applyPlaybackRate(elementRef.current, rate);
      },
    }),
    [store, elementRef, onPlayingChangeRef],
  );
}
