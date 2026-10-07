"use client";

import { ChevronUp } from "lucide-react";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface SmartSearchSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** One collapsible block of the Smart Search panel (an uppercase heading row with a chevron). */
export function SmartSearchSection({
  title,
  defaultOpen = false,
  children,
}: SmartSearchSectionProps) {
  const [isOpen, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className="border-b">
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={() => setOpen((open) => !open)}
          className="flex h-14 w-full items-center justify-between px-6 text-sm tracking-wide text-secondary uppercase hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          {title}
          <ChevronUp
            className={cn("size-4 transition-transform", !isOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={bodyId} hidden={!isOpen} className="px-6 pb-6">
        {children}
      </div>
    </section>
  );
}
