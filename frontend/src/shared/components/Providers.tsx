"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { CreateMeetingProvider } from "@/modules/meetings/context/CreateMeetingContext";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { UIProvider } from "@/shared/context/UIContext";
import { makeQueryClient } from "@/shared/lib/query-client";

interface ProvidersProps {
  children: ReactNode;
}

// Toasts use theme tokens so they follow light/dark (colors.md §1.6).
const TOAST_STYLE = {
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
  fontSize: "14px",
} as const;

export function Providers({ children }: ProvidersProps) {
  // useState (not a module-level constant) gives each browser session one client that survives
  // re-renders, and never shares a cache between server requests.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        {/* One provider so every tooltip shares open delay and skip-delay behaviour. */}
        <TooltipProvider>
          <CreateMeetingProvider>{children}</CreateMeetingProvider>
        </TooltipProvider>
      </UIProvider>
      <Toaster position="top-right" toastOptions={{ style: TOAST_STYLE }} />
    </QueryClientProvider>
  );
}
