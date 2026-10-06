import { ArrowDownToLine } from "lucide-react";

interface JumpToCurrentButtonProps {
  onClick: () => void;
}

/** Floats over the transcript when the playing line has been scrolled out of view. */
export function JumpToCurrentButton({ onClick }: JumpToCurrentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 left-1/2 flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary-600 px-3 text-xs font-medium text-on-primary shadow-lg hover:bg-primary-700"
    >
      <ArrowDownToLine className="size-3.5" aria-hidden="true" />
      Jump to current
    </button>
  );
}
