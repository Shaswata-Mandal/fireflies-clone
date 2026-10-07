/**
 * The app's one axios instance (the HTTP client).
 *
 * WHAT: Pre-configured axios with the backend base URL, a timeout, and a response interceptor that
 *   turns every failure into an `ApiError`.
 * LAYER: Shared library, the lowest frontend layer. Components -> hooks.ts -> api.ts -> this file.
 * CALLED BY: every `modules/<m>/api.ts` (components and hooks never import it directly).
 * CALLS: axios, `env.ts` (base URL) and `api-error.ts` (error normalisation).
 * MERN EQUIVALENT: `axios.create({ baseURL })` in a `src/api/client.js`, with an error interceptor.
 */

import axios from "axios";
import { toApiError } from "@/shared/lib/api-error";
import { env } from "@/shared/lib/env";

/** Requests slower than this fail with a TIMEOUT ApiError instead of leaving the UI spinning. */
export const API_TIMEOUT_MS = 15_000;

/** The one HTTP client. Module `api.ts` files use it; components never do. */
// INTERVIEW: one shared instance means base URL, timeout and error handling are configured once
// instead of being repeated on every call.
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: API_TIMEOUT_MS,
});

// An interceptor runs on every response. The first function handles successes (pass through);
// the second handles failures (everything that is not a 2xx, plus network errors).
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Cancellations (TanStack Query aborting a stale request) aren't failures; pass them through.
    if (axios.isCancel(error)) return Promise.reject(error);
    // Normalise only; no toast here, so queries can render inline error states instead.
    return Promise.reject(toApiError(error));
  },
);
