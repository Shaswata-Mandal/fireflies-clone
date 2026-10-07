/**
 * Context that lets any button open the "create meeting" modal.
 *
 * WHAT: Owns the modal's open state and renders the modal once for the whole app.
 * LAYER: Module context (UI state).
 * CALLED BY: mounted in `shared/components/Providers.tsx`; `useCreateMeetingModal()` is used by
 *   `CaptureButton` and other upload entry points.
 * CALLS: `CreateMeetingModal`.
 * MERN EQUIVALENT: a ModalContext with `openModal()`.
 */

"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CreateMeetingModal } from "@/modules/meetings/components/CreateMeetingModal";

// The context exposes a small API (`open`), not the raw state: consumers cannot close it by mistake.
interface CreateMeetingModalApi {
  open: () => void;
}

const CreateMeetingContext = createContext<CreateMeetingModalApi | null>(null);

interface CreateMeetingProviderProps {
  children: ReactNode;
}

/**
 * Owns the "create meeting" modal so any button (navbar, menus) can open it. Kept apart from
 * UIContext on purpose: that one is layout chrome, this one pulls in the form and its queries.
 */
export function CreateMeetingProvider({ children }: CreateMeetingProviderProps) {
  const [isOpen, setOpen] = useState(false);
  // useCallback + useMemo keep `value` identical between renders, so consumers do not re-render
  // each time the modal opens or closes.
  const open = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <CreateMeetingContext.Provider value={value}>
      {children}
      <CreateMeetingModal open={isOpen} onOpenChange={setOpen} />
    </CreateMeetingContext.Provider>
  );
}

/** @returns `{ open }`. Throws when used outside `<CreateMeetingProvider>`. */
export function useCreateMeetingModal(): CreateMeetingModalApi {
  const context = useContext(CreateMeetingContext);
  if (!context)
    throw new Error("useCreateMeetingModal must be used inside <CreateMeetingProvider>");
  return context;
}
