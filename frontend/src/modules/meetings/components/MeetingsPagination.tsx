/**
 * Previous / Next pager.
 *
 * WHAT: Shows "Page n of m" with buttons that disable at the ends; hidden for a single page.
 * LAYER: Module component (server-safe: it only calls the callback it is given).
 * CALLED BY: `MeetingsView`.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

interface MeetingsPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BUTTON_CLASS =
  "flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm text-default hover:bg-hover disabled:text-disabled disabled:hover:bg-card";

/** Prev / "Page n of m" / Next. Numbered pages keep `?page=` meaningful for reload and shared links. */
export function MeetingsPagination({ page, totalPages, onPageChange }: MeetingsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 py-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={BUTTON_CLASS}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Previous
      </button>
      <span className="text-sm text-secondary" aria-current="page">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={BUTTON_CLASS}
      >
        Next
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
