/**
 * File-download helpers.
 *
 * WHAT: Reads the filename the server suggested and saves a Blob as a file.
 * LAYER: Shared util (browser only).
 * CALLED BY: the meeting export feature (`modules/meetings`).
 * CALLS: browser APIs (URL.createObjectURL, a temporary <a download> link).
 * MERN EQUIVALENT: the `file-saver` package's `saveAs`.
 */

// Turning an API file response into a browser download.

// Regex: `filename=` (case-insensitive), optional quotes, capture group 1 = the name itself.
const FILENAME_PATTERN = /filename\s*=\s*"?([^";]+)"?/i;

/** `attachment; filename="q4-roadmap.md"` → "q4-roadmap.md"; null when absent or unreadable. */
export function filenameFromContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null;
  const name = FILENAME_PATTERN.exec(header)?.[1]?.trim();
  return name ? name : null;
}

/** Saves a Blob through a temporary object URL and a synthetic link click. */
// @param blob the file content (axios `responseType: "blob"`), @param filename the saved name
export function downloadBlob(blob: Blob, filename: string): void {
  // A blob URL points at in-memory data; clicking a link with `download` saves it as a file.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Frees the memory held by the blob URL (otherwise it leaks until the page closes).
  URL.revokeObjectURL(url);
}
