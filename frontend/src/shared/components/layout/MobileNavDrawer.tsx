/**
 * Slide-in navigation for small screens.
 *
 * WHAT: Puts the sidebar inside a left-side sheet (drawer) controlled by `isMobileNavOpen`.
 * LAYER: Shared layout component (client).
 * CALLED BY: `AppShell`.
 * CALLS: `Sidebar`, shadcn `Sheet`, `useUI`.
 * MERN EQUIVALENT: a MUI `<Drawer>` holding the nav.
 */

"use client";

import { Sidebar } from "@/shared/components/layout/Sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { useUI } from "@/shared/context/UIContext";

/**
 * Below lg (and on the meeting page, which has no fixed sidebar) the sidebar lives in a left sheet. Radix Dialog supplies the focus trap, Esc/overlay
 * close and focus return to the hamburger button.
 */
export function MobileNavDrawer() {
  // `onOpenChange={setMobileNavOpen}` lets Radix close the sheet (Esc, overlay click) by calling
  // our state setter.
  const { isMobileNavOpen, setMobileNavOpen } = useUI();

  return (
    <Sheet open={isMobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent
        side="left"
        showCloseButton={false}
        // No visible description; this stops Radix warning about a missing one.
        aria-describedby={undefined}
        className="gap-0 border-r-0 p-0 data-[side=left]:w-58 data-[side=left]:sm:max-w-58"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Sidebar collapsed={false} inDrawer />
      </SheetContent>
    </Sheet>
  );
}
