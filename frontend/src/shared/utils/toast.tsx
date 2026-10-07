import { CircleCheck } from "lucide-react";
import toast from "react-hot-toast";

const ACTION_TOAST_DURATION_MS = 6000;

interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * Success toast in the style of screenshot 29 (surface bg, 1px border, rounded-md, leading icon),
 * with an optional text button. Plain `toast.success` can't hold a button, hence `toast.custom`.
 */
export function showSuccessToast(message: string, action?: ToastAction): void {
  toast.custom(
    (instance) => (
      <div
        role="status"
        className={`flex max-w-sm items-center gap-3 rounded-md border border-default bg-surface px-4 py-3 text-sm text-primary shadow-lg ${
          instance.visible ? "animate-in fade-in-0" : "animate-out fade-out-0"
        }`}
      >
        <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
        <span className="min-w-0 flex-1">{message}</span>
        {action && (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(instance.id);
              action.onClick();
            }}
            className="shrink-0 rounded-sm font-medium text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {action.label}
          </button>
        )}
      </div>
    ),
    { duration: action ? ACTION_TOAST_DURATION_MS : undefined },
  );
}
