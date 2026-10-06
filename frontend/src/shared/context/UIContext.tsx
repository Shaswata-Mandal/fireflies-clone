"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { readStorage, writeStorage } from "@/shared/utils/safe-storage";

// Layout chrome state only (sidebar, mobile drawer, AskFred panel). Server data lives in TanStack Query.

const SIDEBAR_COLLAPSED_KEY = "ui.sidebarCollapsed";

interface UIContextValue {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  isAskFredOpen: boolean;
  setAskFredOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

interface UIProviderProps {
  children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [isAskFredOpen, setAskFredOpen] = useState(false);

  // Storage only exists in the browser, so the saved value is applied after mount. Reading it during
  // render would make the server HTML (always expanded) differ from the first client render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from an external store
    if (readStorage(SIDEBAR_COLLAPSED_KEY) === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      writeStorage(SIDEBAR_COLLAPSED_KEY, String(!collapsed));
      return !collapsed;
    });
  }, []);

  const value = useMemo(
    () => ({
      isSidebarCollapsed,
      toggleSidebar,
      isMobileNavOpen,
      setMobileNavOpen,
      isAskFredOpen,
      setAskFredOpen,
    }),
    [isSidebarCollapsed, toggleSidebar, isMobileNavOpen, isAskFredOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside <UIProvider>");
  return context;
}
