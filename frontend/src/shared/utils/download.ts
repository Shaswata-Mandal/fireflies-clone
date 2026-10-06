// Turning an API file response into a browser download.

const FILENAME_PATTERN = /filename\s*=\s*"?([^";]+)"?/i;

/** `attachment; filename="q4-roadmap.md"` → "q4-roadmap.md"; null when absent or unreadable. */
export function filenameFromContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null;
  const name = FILENAME_PATTERN.exec(header)?.[1]?.trim();
  return name ? name : null;
}

/** Saves a Blob through a temporary object URL and a synthetic link click. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
