/**
 * Client-side provider stack for the whole app.
 *
 * WHAT: Wraps the app in the TanStack Query cache, theme, UI state, tooltip and create-meeting
 *   contexts, and mounts the toast container.
 * LAYER: Shared component (client boundary).
 * CALLED BY: `app/layout.tsx` (a server component), which renders `<Providers>{children}</Providers>`.
 * CALLS: `lib/query-client.ts`, the context providers and react-hot-toast.
 * MERN EQUIVALENT: the `<Provider store={store}><ThemeProvider>...` block in `index.js`.
 * INTERVIEW: the root layout is a server component and cannot hold state or hooks, so all
 * providers live in this one "use client" component.
 */

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { CreateMeetingProvider } from "@/modules/meetings/context/CreateMeetingContext";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { ThemeProvider } from "@/shared/context/ThemeContext";
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

/**
 * @param children the whole page tree
 * @returns the tree wrapped in every provider
 */
export function Providers({ children }: ProvidersProps) {
  // useState (not a module-level constant) gives each browser session one client that survives
  // re-renders, and never shares a cache between server requests.
  // Passing the function (not calling it) is a lazy initialiser: it runs once, on first render.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UIProvider>
          {/* One provider so every tooltip shares open delay and skip-delay behaviour. */}
          <TooltipProvider>
            <CreateMeetingProvider>{children}</CreateMeetingProvider>
          </TooltipProvider>
        </UIProvider>
      </ThemeProvider>
      <Toaster position="top-right" toastOptions={{ style: TOAST_STYLE }} />
    </QueryClientProvider>
  );
}
