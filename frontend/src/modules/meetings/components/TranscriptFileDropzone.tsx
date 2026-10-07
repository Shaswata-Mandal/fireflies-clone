/**
 * Drag-and-drop file zone for transcript upload.
 *
 * WHAT: A dashed drop area plus a "Browse Files" button; shows the chosen file and any error.
 * LAYER: Module component (client: drag state, file input ref).
 * CALLED BY: `CreateMeetingForm` (upload tab).
 * CALLS: `formatFileSize`, `Button`.
 * INTERVIEW: validation lives in the zod schema, not here; this component only reports the file
 * (single responsibility).
 */

"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FORM_COPY, TRANSCRIPT_ACCEPT } from "@/modules/meetings/constants";
import { formatFileSize } from "@/modules/meetings/upload-file";
import { fieldErrorId } from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

interface TranscriptFileDropzoneProps {
  id: string;
  file: File | null;
  /** Validation message from the form (client rules or the server), shown under the zone. */
  error?: string;
  disabled?: boolean;
  /** `page` is the roomy /uploads layout (screenshot 28); `modal` is the compact one. */
  variant: "modal" | "page";
  onFileChange: (file: File | null) => void;
}

/**
 * Dashed drop zone from screenshot 28. Keyboard users get a real "Browse Files" button that opens
 * the picker; the file input itself is hidden, so there is one tab stop. Only the first dropped
 * file is used. Validation happens in the form's schema, so this component just reports the file.
 */
export function TranscriptFileDropzone({
  id,
  file,
  error,
  disabled,
  variant,
  onFileChange,
}: TranscriptFileDropzoneProps) {
  // The real <input type="file"> is hidden; the button calls `inputRef.current.click()` to open
  // the system file picker. A ref is needed because we call a DOM method imperatively.
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);

  // Drag events: `onDragOver` must call preventDefault, or the browser would refuse the drop.
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files.item(0);
    if (dropped) onFileChange(dropped);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.item(0);
    if (chosen) onFileChange(chosen);
    // Clearing lets the user pick the same file again after removing it.
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed border-dropzone px-6 text-center transition-colors",
          variant === "page" ? "py-16" : "py-8",
          isDragging && "bg-primary-subtle",
        )}
      >
        <Upload className="size-6 text-primary-fg" aria-hidden="true" />
        <p className="text-lg font-semibold text-primary">{FORM_COPY.DROP_TITLE}</p>
        <p className="max-w-md text-xs text-secondary">{FORM_COPY.DROP_BODY}</p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={TRANSCRIPT_ACCEPT}
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={handleInputChange}
        />
        <Button
          type="button"
          size="lg"
          disabled={disabled}
          aria-describedby={error ? fieldErrorId(id) : undefined}
          onClick={() => inputRef.current?.click()}
          className="bg-primary-600 px-4 text-on-primary hover:bg-primary-700"
        >
          Browse Files
        </Button>
      </div>

      {file && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
          <FileText className="size-5 shrink-0 text-primary-fg" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-primary">{file.name}</p>
            <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Remove ${file.name}`}
            onClick={() => onFileChange(null)}
            className="rounded-md p-1.5 text-secondary hover:bg-hover hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <p id={fieldErrorId(id)} role="alert" className="text-xs text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
