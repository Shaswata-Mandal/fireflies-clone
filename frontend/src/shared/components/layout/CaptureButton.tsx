"use client";

import { ChevronDown, Video } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { CAPTURE_MENU_ITEMS } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/routes";
import { showComingSoon } from "@/shared/utils/coming-soon";

const ITEM_CLASS = "text-default focus:bg-hover gap-3 px-3 py-2 text-sm";

/** Purple split button (03 / 27): main part goes to Uploads, the chevron lists capture options. */
export function CaptureButton() {
  return (
    <div className="flex h-8 shrink-0 overflow-hidden rounded-md bg-primary-600 text-on-primary">
      <Link
        href={ROUTES.UPLOADS}
        className="flex items-center gap-2 px-3 text-sm font-medium hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <Video className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Capture</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More capture options"
          className="flex items-center border-l border-primary-800 px-2 hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset data-[state=open]:bg-primary-700"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 bg-surface">
          {CAPTURE_MENU_ITEMS.map(({ label, icon: Icon, href }) =>
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
                onSelect={() => showComingSoon(label)}
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
