/**
 * TanStack Query client factory and global defaults.
 *
 * WHAT: Builds the `QueryClient` (the cache) with app-wide rules: 30 s freshness, one retry for
 *   network/5xx errors, no retries for 4xx, and one central toast for failed mutations.
 * LAYER: Shared library.
 * CALLED BY: `shared/components/Providers.tsx` (creates one client per browser session).
 * CALLS: @tanstack/react-query, react-hot-toast, `api-error.ts`.
 * MERN EQUIVALENT: configuring a Redux store, plus a global axios error handler that shows toasts.
 */

import { MutationCache, QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { isApiError } from "@/shared/lib/api-error";

// `staleTime`: how long fetched data counts as fresh. Within it, remounting a component reuses the
// cache instead of calling the API again.
const DEFAULT_STALE_TIME_MS = 30_000;
const MAX_RETRIES = 1;
const FALLBACK_ERROR_MESSAGE = "Something went wrong";

// Types `meta` on every useMutation call, so `meta: { suppressErrorToast: true }` is checked.
// (TypeScript "declaration merging": adds our field to the library's `Register` interface.)
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { suppressErrorToast?: boolean };
  }
}

/** True for 4xx responses (the client sent something wrong). */
function isClientError(error: unknown): boolean {
  return isApiError(error) && error.status !== null && error.status >= 400 && error.status < 500;
}

/**
 * Retry rule for queries: retry network/5xx errors once, never 4xx.
 * @param failureCount how many times this request has already failed
 * @param error the error from the last attempt
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // A 4xx means the request itself is wrong; repeating it cannot succeed.
  if (isClientError(error)) return false;
  return failureCount < MAX_RETRIES;
}

/**
 * Creates a fresh QueryClient. A function (not a shared constant) so each browser session, and
 * each test, gets its own cache.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        // Off: switching tabs would otherwise refetch every active query, which is noisy in a demo.
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
    // INTERVIEW: a global error handler for writes. Components don't need their own try/catch +
    // toast; a hook opts out with `meta: { suppressErrorToast: true }` when it shows its own message.
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
