/**
 * The purple "Upload" split button in the navbar.
 *
 * WHAT: Main click opens the create-meeting modal; the chevron opens a menu of other options.
 * LAYER: Shared layout component (client).
 * CALLED BY: `Navbar`.
 * CALLS: `useCreateMeetingModal` (meetings module context), shadcn `DropdownMenu`.
 * MERN EQUIVALENT: a split button / dropdown button component.
 */

"use client";

import { ChevronDown, Upload } from "lucide-react";
import Link from "next/link";
import { useCreateMeetingModal } from "@/modules/meetings/context/CreateMeetingContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { CAPTURE_MENU_ITEMS } from "@/shared/constants/navigation";
import { showComingSoon } from "@/shared/utils/coming-soon";

const ITEM_CLASS = "text-default focus:bg-hover gap-3 px-3 py-2 text-sm";

/**
 * Purple split button (03 / 27). The main part opens the create-meeting modal from anywhere (the
 * clone uploads transcripts, so "Capture" became "Upload"); the chevron lists the other capture
 * options, which are out of scope and say "Coming soon".
 */
export function CaptureButton() {
  // The modal's open state lives in a context, so this button (in the navbar) can open a modal
  // that is rendered elsewhere in the tree.
  const { open } = useCreateMeetingModal();

  // `sr-only sm:not-sr-only`: the "Upload" text is screen-reader-only on phones and visible from
  // the `sm` breakpoint up.
  return (
    <div className="flex h-8 shrink-0 overflow-hidden rounded-md bg-primary-600 text-on-primary">
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-2 px-3 text-sm font-medium hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <Upload className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Upload</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More upload options"
          className="flex items-center border-l border-primary-800 px-2 hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset data-[state=open]:bg-primary-700"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 bg-surface">
          {CAPTURE_MENU_ITEMS.map(({ label, icon: Icon, href, action }) =>
            href ? (
              <DropdownMenuItem key={label} asChild className={ITEM_CLASS}>
                <Link href={href}>
                  <Icon className="size-4 text-secondary" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={label}
                className={ITEM_CLASS}
                onSelect={() => (action === "open-create-meeting" ? open() : showComingSoon(label))}
              >
                <Icon className="size-4 text-secondary" />
                {label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
