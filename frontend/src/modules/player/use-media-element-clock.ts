"use client";

import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_PLAYBACK_RATE } from "@/modules/player/constants";
import type { ClockOptions, PlayerEngine } from "@/modules/player/types";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";

const MS_PER_SECOND = 1000;

// DOM writes live in plain functions: the React Compiler lint treats hook arguments as immutable,
// but an HTMLMediaElement is an imperative handle that must be written to.
function applyPlaybackRate(media: HTMLMediaElement, rate: number): void {
  media.playbackRate = rate;
}

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
  const elementRef = useLatestRef(element);
  const onPlayingChangeRef = useLatestRef(onPlayingChange);
  const onDurationChangeRef = useLatestRef(onDurationChange);
  // Remembered so a rate picked before the element mounts is applied when it does.
  const rateRef = useRef(DEFAULT_PLAYBACK_RATE);

  useEffect(() => {
    if (!element) return;
    let frame: number | null = null;
    applyPlaybackRate(element, rateRef.current);

    const syncTime = () => store.setTimeMs(element.currentTime * MS_PER_SECOND);
    const loop = () => {
      syncTime();
      frame = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
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

    element.addEventListener("play", handlePlay);
    element.addEventListener("pause", handlePause);
    element.addEventListener("seeked", syncTime);
    element.addEventListener("loadedmetadata", handleMetadata);
    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) handleMetadata();

    return () => {
      element.removeEventListener("play", handlePlay);
      element.removeEventListener("pause", handlePause);
      element.removeEventListener("seeked", syncTime);
      element.removeEventListener("loadedmetadata", handleMetadata);
      stopLoop();
      element.pause();
    };
  }, [element, store, onPlayingChangeRef, onDurationChangeRef]);

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
