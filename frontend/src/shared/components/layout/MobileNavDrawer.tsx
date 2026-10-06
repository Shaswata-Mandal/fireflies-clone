"use client";

import { Sidebar } from "@/shared/components/layout/Sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { useUI } from "@/shared/context/UIContext";

/**
 * Below lg the sidebar lives in a left sheet. Radix Dialog supplies the focus trap, Esc/overlay
 * close and focus return to the hamburger button.
 */
export function MobileNavDrawer() {
  const { isMobileNavOpen, setMobileNavOpen } = useUI();

  return (
    <Sheet open={isMobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent
        side="left"
        showCloseButton={false}
        // No visible description; this stops Radix warning about a missing one.
        aria-describedby={undefined}
        className="w-58 gap-0 border-r-0 p-0 lg:hidden"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Sidebar collapsed={false} inDrawer />
      </SheetContent>
    </Sheet>
  );
}
