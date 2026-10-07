/**
 * Date-range inputs inside the filter popover.
 *
 * WHAT: Two native date inputs ("From", "To") that keep the range valid.
 * LAYER: Module component (client).
 * CALLED BY: `MeetingsFilterPopover`.
 * CALLS: nothing.
 * INTERVIEW: native `<input type="date">` avoids a date-picker dependency (CLAUDE.md: no new
 * dependencies without a reason). `dark:[color-scheme:dark]` makes the browser's own calendar
 * popup use dark colours in dark mode.
 */

"use client";

interface DateRange {
  dateFrom: string | null;
  dateTo: string | null;
}

interface FilterDateRangePaneProps extends DateRange {
  onChange: (range: DateRange) => void;
}

const INPUT_CLASS =
  "h-9 w-full rounded-md border border-strong bg-card px-2.5 text-sm text-default outline-none focus:border-focus dark:[color-scheme:dark]";

/**
 * Native date inputs: accessible and keyboard-friendly with no date-picker dependency. Values are
 * `YYYY-MM-DD`, exactly what the API expects; `min`/`max` stop an inverted range.
 */
export function FilterDateRangePane({ dateFrom, dateTo, onChange }: FilterDateRangePaneProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex w-full items-center justify-between text-sm text-default">
        Meeting date
        <button
          type="button"
          disabled={!dateFrom && !dateTo}
          onClick={() => onChange({ dateFrom: null, dateTo: null })}
          className="text-sm text-link hover:underline disabled:text-disabled disabled:no-underline"
        >
          Clear all
        </button>
      </legend>

      <label className="flex flex-col gap-1.5 text-sm text-secondary">
        From
        <input
          type="date"
          value={dateFrom ?? ""}
          max={dateTo ?? undefined}
          onChange={(event) => onChange({ dateFrom: event.target.value || null, dateTo })}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-secondary">
        To
        <input
          type="date"
          value={dateTo ?? ""}
          min={dateFrom ?? undefined}
          onChange={(event) => onChange({ dateFrom, dateTo: event.target.value || null })}
          className={INPUT_CLASS}
        />
      </label>

      <p className="text-xs text-muted">Both dates are included.</p>
    </fieldset>
  );
}
