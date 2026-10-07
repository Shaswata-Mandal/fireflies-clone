/**
 * Custom success toast with an optional action button.
 *
 * WHAT: Wraps `toast.custom` to match the Fireflies toast look (screenshot 29).
 * LAYER: Shared util that renders JSX, hence `.tsx`.
 * CALLED BY: mutation hooks that want an "Undo" or "View" action after success.
 * CALLS: react-hot-toast and lucide icons.
 * MERN EQUIVALENT: `toast.custom((t) => <MyToast />)` from react-hot-toast.
 */

import { CircleCheck } from "lucide-react";
import toast from "react-hot-toast";

// Toasts with a button stay longer than plain ones so the user has time to reach the button.
const ACTION_TOAST_DURATION_MS = 6000;

interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * Success toast in the style of screenshot 29 (surface bg, 1px border, rounded-md, leading icon),
 * with an optional text button. Plain `toast.success` can't hold a button, hence `toast.custom`.
 */
// @param message the text; @param action optional { label, onClick } shown as a link-style button
export function showSuccessToast(message: string, action?: ToastAction): void {
  // The render function receives `instance` (visible flag and id) from react-hot-toast; the
  // enter/exit animation classes (`animate-in`, `animate-out`) come from tw-animate-css.
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
