/**
 * The playback-position store (a tiny observable, outside React).
 *
 * WHAT: Holds one number (current time in ms) and lets code subscribe to changes.
 * LAYER: Module core (plain TypeScript; no React import at all).
 * CALLED BY: `PlayerProvider` creates it; the clocks write to it; `usePlayerTimeMs`,
 *   `useActiveSegmentIndex` and `useActiveChapterIndex` read from it.
 * CALLS: nothing.
 * MERN EQUIVALENT: a minimal Redux/Zustand store, or an EventEmitter holding one value.
 * INTERVIEW: this is the shape `useSyncExternalStore` expects: `subscribe(listener)` returning an
 * unsubscribe function, and a synchronous getter.
 */

/**
 * The playback position, kept outside React state on purpose.
 *
 * The clock writes it on every animation frame (~60×/s). If it were React state, every consumer
 * (and the whole transcript under the provider) would re-render 60×/s. Instead components read it
 * with `useSyncExternalStore` and a *derived* snapshot (time rounded to 100 ms, or the active
 * segment index), so React only re-renders a component when its derived value actually changes.
 */
export interface TimeStore {
  getTimeMs: () => number;
  setTimeMs: (ms: number) => void;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Creates a store. Everything lives in a closure: `timeMs` and `listeners` are private variables
 * that only the returned functions can touch.
 * @param initialMs the starting position
 */
export function createTimeStore(initialMs = 0): TimeStore {
  let timeMs = initialMs;
  // A Set stores each listener once and makes add/remove cheap.
  const listeners = new Set<() => void>();

  return {
    getTimeMs: () => timeMs,
    setTimeMs: (ms) => {
      // No change = no notification, so identical values never wake any subscriber.
      if (ms === timeMs) return;
      timeMs = ms;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      // The returned function is the "unsubscribe"; React calls it on unmount.
      return () => listeners.delete(listener);
    },
  };
}
