/**
 * WAI-ARIA tabs keyboard model for a horizontal tablist: ←/→ move (wrapping), Home/End jump to the
 * ends. Returns the index to activate, or null for keys the tablist doesn't handle.
 */
export function nextTabIndex(key: string, currentIndex: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowRight":
      return (currentIndex + 1) % count;
    case "ArrowLeft":
      return (currentIndex - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
