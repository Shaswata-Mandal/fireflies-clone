/**
 * The persistent page frame: sidebar, navbar, main content and the AskFred panel/dock.
 *
 * WHAT: Decides which chrome to show for the current URL (full-page routes, meeting page, home).
 * LAYER: Shared layout component (client: uses the pathname and UI context).
 * CALLED BY: `app/layout.tsx`, wrapped around every page.
 * CALLS: Sidebar, Navbar, MobileNavDrawer, AskFredDock/Panel, `useUI`, `useAskChat`.
 * MERN EQUIVALENT: the `<Layout>` component around `<Outlet />` in React Router.
 * INTERVIEW: it lives in the root layout, so it is not remounted on navigation: the sidebar and
 * chat keep their state while only `children` (the page) changes.
 */

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAskChat } from "@/modules/meetings/use-ask-chat";
import { AskFredDock } from "@/shared/components/layout/AskFredDock";
import { AskFredPanel } from "@/shared/components/layout/AskFredPanel";
import { MobileNavDrawer } from "@/shared/components/layout/MobileNavDrawer";
import { Navbar } from "@/shared/components/layout/Navbar";
import { Sidebar } from "@/shared/components/layout/Sidebar";
import { ROUTES, isFullPageRoute, isMeetingDetailRoute } from "@/shared/constants/routes";
import { useUI } from "@/shared/context/UIContext";
import { cn } from "@/shared/utils/cn";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Persistent chrome around every page: sidebar | (navbar over content + AskFred panel).
 * Lives in the root layout, so it isn't remounted on navigation and keeps its state.
 */
export function AppShell({ children }: AppShellProps) {
  // `usePathname` re-renders this component whenever the URL changes.
  const pathname = usePathname();
  const { isSidebarCollapsed, isAskFredOpen, setAskFredOpen } = useUI();
  // One cross-meeting conversation shared by the dock and the panel.
  const chat = useAskChat(null);
  const isMeetingPage = isMeetingDetailRoute(pathname);

  const showDock = pathname === ROUTES.HOME && !isAskFredOpen;
  // A meeting page has its own AskFred tab, so the global panel must not open on top of it.
  const showGlobalPanel = isAskFredOpen && !isMeetingPage;

  // Sends the text and opens the panel so the answer is visible.
  function handleAsk(message: string) {
    chat.send(message);
    setAskFredOpen(true);
  }

  // Settings and Team bring their own menu, so they render without our sidebar/navbar.
  if (isFullPageRoute(pathname)) {
    return <div className="h-dvh overflow-y-auto">{children}</div>;
  }

  // Layout notes: `h-dvh` = full dynamic viewport height; `overflow-hidden` on the root and
  // `overflow-y-auto` on <main> make only the content area scroll. `min-w-0`/`min-h-0` let flex
  // children shrink instead of overflowing. The first link is a keyboard "skip to content" link.
  // The sidebar is hidden below the `lg` breakpoint (the drawer replaces it on small screens).
  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary-600 px-3 py-2 text-on-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      {/* The meeting page has its own rail (docs/reference/17); the app menu opens from ☰. */}
      {!isMeetingPage && (
        <div className="hidden lg:flex">
          <Sidebar collapsed={isSidebarCollapsed} />
        </div>
      )}
      <MobileNavDrawer />

      <div className="flex min-w-0 flex-1 flex-col">
        {!isMeetingPage && <Navbar />}
        <div className="relative flex min-h-0 flex-1">
          <main
            id="main-content"
            className={cn("min-w-0 flex-1 overflow-y-auto", showDock && "pb-40")}
          >
            {children}
          </main>
          {showDock && <AskFredDock onAsk={handleAsk} onOpenPanel={() => setAskFredOpen(true)} />}
          {showGlobalPanel && <AskFredPanel chat={chat} onClose={() => setAskFredOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
