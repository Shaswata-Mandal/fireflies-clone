/**
 * Clipboard helper.
 *
 * WHAT: Copies text to the clipboard without ever throwing.
 * LAYER: Shared util.
 * CALLED BY: transcript/summary "copy" buttons.
 * CALLS: the browser's `navigator.clipboard`.
 * MERN EQUIVALENT: a small `copyToClipboard` helper around the Clipboard API.
 */

/**
 * Copies text; resolves false instead of throwing (insecure origin, permission denied, old browser).
 * @param text what to copy
 * @returns a Promise of true on success, false on any failure (callers show the right toast)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // `await` pauses until the browser has finished writing; a rejected promise lands in `catch`.
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
