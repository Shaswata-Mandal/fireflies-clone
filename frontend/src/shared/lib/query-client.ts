import { MutationCache, QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { isApiError } from "@/shared/lib/api-error";

const DEFAULT_STALE_TIME_MS = 30_000;
const MAX_RETRIES = 1;
const FALLBACK_ERROR_MESSAGE = "Something went wrong";

// Types `meta` on every useMutation call, so `meta: { suppressErrorToast: true }` is checked.
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { suppressErrorToast?: boolean };
  }
}

function isClientError(error: unknown): boolean {
  return isApiError(error) && error.status !== null && error.status >= 400 && error.status < 500;
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  // A 4xx means the request itself is wrong; repeating it cannot succeed.
  if (isClientError(error)) return false;
  return failureCount < MAX_RETRIES;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
    // One place shows mutation error toasts (CLAUDE.md §5). Queries are excluded on purpose:
    // they render inline error states, and a failing list shouldn't also spam toasts.
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (mutation.meta?.suppressErrorToast) return;
        toast.error(isApiError(error) ? error.message : FALLBACK_ERROR_MESSAGE);
      },
    }),
  });
}
