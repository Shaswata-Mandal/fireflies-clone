"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CreateMeetingModal } from "@/modules/meetings/components/CreateMeetingModal";

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
  const open = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <CreateMeetingContext.Provider value={value}>
      {children}
      <CreateMeetingModal open={isOpen} onOpenChange={setOpen} />
    </CreateMeetingContext.Provider>
  );
}

export function useCreateMeetingModal(): CreateMeetingModalApi {
  const context = useContext(CreateMeetingContext);
  if (!context)
    throw new Error("useCreateMeetingModal must be used inside <CreateMeetingProvider>");
  return context;
}
