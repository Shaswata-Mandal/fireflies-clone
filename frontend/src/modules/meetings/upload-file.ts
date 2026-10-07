import {
  BYTES_PER_KB,
  MAX_UPLOAD_BYTES,
  TRANSCRIPT_EXTENSIONS,
} from "@/modules/meetings/constants";

/** Lower-cased extension without the dot, or "" when there is none ("notes", ".gitignore" → ""). */
export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

/** "Q4 Roadmap.txt" → "Q4 Roadmap"; names without an extension are returned trimmed. */
export function titleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  return stem.trim();
}

/** 1536 → "1.5 KB". */
export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) return `${bytes} B`;
  const kb = bytes / BYTES_PER_KB;
  if (kb < BYTES_PER_KB) return `${kb.toFixed(1)} KB`;
  return `${(kb / BYTES_PER_KB).toFixed(1)} MB`;
}

/** Returns an error message, or null when the file can be sent. Same rules as the backend. */
export function validateTranscriptFile(file: Pick<File, "name" | "size">): string | null {
  if (!file.name.trim()) return "The file has no name";
  const extension = fileExtension(file.name);
  if (!TRANSCRIPT_EXTENSIONS.some((allowed) => allowed === extension)) {
    return "Only .txt, .vtt and .json files are supported";
  }
  if (file.size === 0) return "The file is empty";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `The file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_UPLOAD_BYTES)}`;
  }
  return null;
}
