"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import type { FormEvent } from "react";

const SHORTCUT_KEY = "k";

/**
 * Visual placeholder for global search (Phase 5). Typing works and Ctrl/Cmd + K focuses it, but
 * submitting does nothing yet.
 */
export function NavbarSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== SHORTCUT_KEY || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault(); // browsers bind Ctrl+K to their own search bar
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="hidden w-full max-w-80 md:block">
      <label className="flex h-8 items-center gap-2 rounded-md border border-strong bg-card px-2.5 focus-within:border-focus">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="sr-only">Search meetings</span>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search by title or keyword"
          className="min-w-0 flex-1 bg-transparent text-sm text-default outline-none placeholder:text-muted"
        />
        <kbd className="shrink-0 font-sans text-xs text-muted">Ctrl + K</kbd>
      </label>
    </form>
  );
}
