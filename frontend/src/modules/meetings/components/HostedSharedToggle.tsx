"use client";

import { showComingSoon } from "@/shared/utils/coming-soon";

const OPTIONS = ["Hosted by me", "Shared with me"] as const;

/**
 * The joined "Hosted by me | Shared with me" buttons from screenshot 09. There is no sharing model
 * (team sharing is out of scope), so they are visual only and explain that on click.
 */
export function HostedSharedToggle() {
  return (
    <div role="group" aria-label="Ownership" className="flex overflow-hidden rounded-md border">
      {OPTIONS.map((label, index) => (
        <button
          key={label}
          type="button"
          onClick={() => showComingSoon(label)}
          className={
            index === 0
              ? "h-9 px-3 text-sm text-default hover:bg-hover"
              : "h-9 border-l px-3 text-sm text-default hover:bg-hover"
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
