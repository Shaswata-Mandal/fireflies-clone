import axios from "axios";
import { toApiError } from "@/shared/lib/api-error";
import { env } from "@/shared/lib/env";

/** Requests slower than this fail with a TIMEOUT ApiError instead of leaving the UI spinning. */
export const API_TIMEOUT_MS = 15_000;

/** The one HTTP client. Module `api.ts` files use it; components never do. */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Cancellations (TanStack Query aborting a stale request) aren't failures; pass them through.
    if (axios.isCancel(error)) return Promise.reject(error);
    // Normalise only; no toast here, so queries can render inline error states instead.
    return Promise.reject(toApiError(error));
  },
);
