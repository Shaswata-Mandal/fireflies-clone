/**
 * Debounced search box for the library.
 *
 * WHAT: An icon that expands into an input; typing updates the URL's `q` after a short pause.
 * LAYER: Module component (client).
 * CALLED BY: `MeetingsToolbar`.
 * CALLS: `useDebounce`.
 * INTERVIEW: this component keeps the typed text in local state (so typing feels instant) but
 * the URL `q` is the source of truth; the block marked below re-syncs when `q` changes elsewhere.
 */

"use client";

import { Search, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { SEARCH_DEBOUNCE_MS } from "@/modules/meetings/constants";
import { useDebounce } from "@/shared/hooks/use-debounce";

interface MeetingsSearchProps {
  /** Current `q` from the URL. */
  value: string;
  /** Called with the trimmed, debounced text. */
  onSearch: (q: string) => void;
}

/** Search icon that expands into the input from screenshot 14. Typing is debounced into `q`. */
export function MeetingsSearch({ value, onSearch }: MeetingsSearchProps) {
  // useRef: the DOM node of the input, to focus it programmatically (no re-render needed).
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedText = useDebounce(text, SEARCH_DEBOUNCE_MS);

  // When `q` changes from outside (Clear filters, Back button), show it in the box. Changes that
  // came from our own debounce are skipped, so text typed since then isn't overwritten.
  // "Adjusting state while rendering": React allows setting state during render when it is guarded
  // by a comparison like the one below. It avoids an extra effect and an extra paint.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value !== debouncedText.trim()) setText(value);
  }

  // `useEffectEvent` = a function that always sees the latest props/state but is NOT a dependency
  // of the effect below. That is why the effect can depend only on `debouncedText`.
  const commit = useEffectEvent((next: string) => {
    if (next !== value) onSearch(next);
  });

  // Runs only when the debounced text settles, not when `value` changes, so an external clear
  // can't be undone by a stale debounced string.
  useEffect(() => {
    commit(debouncedText.trim());
  }, [debouncedText]);

  const isExpanded = isOpen || text !== "";

  function open() {
    setIsOpen(true);
    // Focus after the input has rendered.
    // `requestAnimationFrame` waits until the browser has painted the input before focusing it.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function clear() {
    setText("");
    onSearch(""); // no reason to wait for the debounce when clearing
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    setText("");
    onSearch("");
    setIsOpen(false);
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Search meetings"
        className="flex size-9 items-center justify-center rounded-md border bg-card text-default hover:bg-hover"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div role="search" className="w-full sm:w-80">
      <label className="flex h-9 items-center gap-2 rounded-md border border-focus bg-card px-2.5">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="sr-only">Search meetings by title</span>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setIsOpen(false)}
          placeholder="Search meetings"
          className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
        />
        {text && (
          <button
            type="button"
            onClick={clear}
            // Keep focus in the input: blur would collapse the box before the click lands.
            onMouseDown={(event) => event.preventDefault()}
            aria-label="Clear search"
            className="rounded p-0.5 text-muted hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </label>
    </div>
  );
}
