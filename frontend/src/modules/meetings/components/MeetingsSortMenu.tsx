"use client";

import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS } from "@/modules/meetings/constants";
import type { MeetingSort } from "@/modules/meetings/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface MeetingsSortMenuProps {
  value: MeetingSort;
  onChange: (sort: MeetingSort) => void;
}

function isMeetingSort(value: string): value is MeetingSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/** Sort dropdown over the API's four whitelisted values (not in the screenshots; styled like 11). */
export function MeetingsSortMenu({ value, onChange }: MeetingsSortMenuProps) {
  const current = SORT_OPTIONS.find((option) => option.value === value) ?? SORT_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm text-default hover:bg-hover data-[state=open]:bg-hover">
        <ArrowUpDown className="size-4" aria-hidden="true" />
        <span className="sr-only">Sort by: </span>
        {current.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 border border-default bg-surface ring-0">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (isMeetingSort(next)) onChange(next);
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="h-9">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
