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
  const pathname = usePathname();
  const { isSidebarCollapsed, isAskFredOpen, setAskFredOpen } = useUI();
  // One cross-meeting conversation shared by the dock and the panel.
  const chat = useAskChat(null);
  const isMeetingPage = isMeetingDetailRoute(pathname);

  const showDock = pathname === ROUTES.HOME && !isAskFredOpen;
  // A meeting page has its own AskFred tab, so the global panel must not open on top of it.
  const showGlobalPanel = isAskFredOpen && !isMeetingPage;

  function handleAsk(message: string) {
    chat.send(message);
    setAskFredOpen(true);
  }

  if (isFullPageRoute(pathname)) {
    return <div className="h-dvh overflow-y-auto">{children}</div>;
  }

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
