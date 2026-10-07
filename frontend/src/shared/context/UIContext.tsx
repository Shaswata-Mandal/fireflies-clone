/**
 * Layout-chrome UI state shared across the app.
 *
 * WHAT: A React Context for the sidebar (collapsed, mobile drawer), the AskFred panel and the
 *   right-hand tab on the meeting page.
 * LAYER: Shared context (UI state, never server data).
 * CALLED BY: mounted in `Providers.tsx`; read with `useUI()` by Sidebar, Navbar, AskFred parts.
 * CALLS: `utils/safe-storage.ts` to remember the collapsed sidebar.
 * MERN EQUIVALENT: a Context (or small Redux slice) with `sidebarOpen`-style flags.
 */

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { readStorage, writeStorage } from "@/shared/utils/safe-storage";

// Layout chrome state only (sidebar, mobile drawer, AskFred panel). Server data lives in TanStack Query.

const SIDEBAR_COLLAPSED_KEY = "ui.sidebarCollapsed";

export type MeetingPanelTab = "askfred" | "transcript";

// INTERVIEW: split by concern. Theme, UI chrome and the create-meeting modal each have their own
// small context, so a change in one does not re-render consumers of the others.
interface UIContextValue {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  isAskFredOpen: boolean;
  setAskFredOpen: (open: boolean) => void;
  /** Right-hand tab on a meeting page. The sidebar's AskFred button selects it there. */
  meetingPanelTab: MeetingPanelTab;
  setMeetingPanelTab: (tab: MeetingPanelTab) => void;
}

// `null` default lets `useUI` detect a missing provider.
const UIContext = createContext<UIContextValue | null>(null);

interface UIProviderProps {
  children: ReactNode;
}

/**
 * Holds the UI flags in `useState` and shares them through context.
 * @param children the app subtree
 */
export function UIProvider({ children }: UIProviderProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [meetingPanelTab, setMeetingPanelTab] = useState<MeetingPanelTab>("askfred");
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [isAskFredOpen, setAskFredOpen] = useState(false);

  // Storage only exists in the browser, so the saved value is applied after mount. Reading it during
  // render would make the server HTML (always expanded) differ from the first client render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from an external store
    if (readStorage(SIDEBAR_COLLAPSED_KEY) === "true") setSidebarCollapsed(true);
  }, []);

  // The functional form `(collapsed) => ...` reads the latest value, so the callback needs no
  // dependencies and keeps a stable identity.
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      writeStorage(SIDEBAR_COLLAPSED_KEY, String(!collapsed));
      return !collapsed;
    });
  }, []);

  // The dependency list omits the `set...` functions: React guarantees `useState` setters are
  // stable, so listing them would change nothing.
  const value = useMemo(
    () => ({
      isSidebarCollapsed,
      toggleSidebar,
      isMobileNavOpen,
      setMobileNavOpen,
      isAskFredOpen,
      setAskFredOpen,
      meetingPanelTab,
      setMeetingPanelTab,
    }),
    [isSidebarCollapsed, toggleSidebar, isMobileNavOpen, isAskFredOpen, meetingPanelTab],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/**
 * Reads the UI context.
 * @throws if called outside `<UIProvider>`
 */
export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside <UIProvider>");
  return context;
}
