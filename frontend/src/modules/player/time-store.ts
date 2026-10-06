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

export function createTimeStore(initialMs = 0): TimeStore {
  let timeMs = initialMs;
  const listeners = new Set<() => void>();

  return {
    getTimeMs: () => timeMs,
    setTimeMs: (ms) => {
      if (ms === timeMs) return;
      timeMs = ms;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
