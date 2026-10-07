/**
 * One error type for every failed API call.
 *
 * WHAT: Defines `ApiError` and `toApiError()`, which converts whatever axios throws (HTTP error,
 *   timeout, offline, odd response) into the same shape: { status, code, message, details }.
 * LAYER: Shared library.
 * CALLED BY: `api-client.ts` (interceptor), `query-client.ts` (toasts) and components that show
 *   error messages (`ErrorState`, form error mapping).
 * CALLS: axios (only for type checks like `isAxiosError`).
 * MERN EQUIVALENT: a custom `AppError` class plus a helper that unwraps `err.response.data`.
 */

import axios from "axios";

// ---------------------------------------------------------------------------
// Error codes produced on the client (the backend's own codes come from the response body)
// ---------------------------------------------------------------------------

export const NETWORK_ERROR_CODE = "NETWORK_ERROR";
export const TIMEOUT_ERROR_CODE = "TIMEOUT";
export const UNKNOWN_ERROR_CODE = "UNKNOWN_ERROR";

const AXIOS_TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

/** Envelope the backend returns for every error (backend/app/core/exceptions.py, docs/api.md). */
// (Not exported: only `isApiErrorBody` below needs it, to check the shape at runtime.)
interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface ApiErrorInit {
  status: number | null;
  code: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

/** The single error type every API call rejects with, so callers handle one shape. */
export class ApiError extends Error {
  /** HTTP status, or null when no response arrived (offline, timeout, CORS). */
  readonly status: number | null;
  /** Machine-readable code, e.g. "MEETING_NOT_FOUND", "VALIDATION_ERROR", "NETWORK_ERROR". */
  readonly code: string;
  /** Extra context from the backend, e.g. field errors for VALIDATION_ERROR. */
  readonly details: unknown;

  // The second parameter is destructured with a default (`details = null`), so callers may omit it.
  constructor(message: string, { status, code, details = null }: ApiErrorInit) {
    super(message);
    // Needed so logs and `error.name` show "ApiError" instead of the generic "Error".
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Type guard so hooks/components can narrow an `unknown` error without casting. */
// `value is ApiError` is a type predicate: when this returns true, TypeScript narrows the type.
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Runtime check that a response body matches the backend's error envelope (no `any` casts). */
function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== "object" || data === null || !("error" in data)) return false;
  const { error } = data;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

/**
 * Converts anything a request can throw into an ApiError.
 *
 * INTERVIEW: the order of checks is the story: already ours -> not an axios error -> no response
 * (offline/timeout/CORS) -> response with our envelope -> response without it (proxy/host page).
 *
 * @param error whatever was thrown (typed `unknown`, because anything can be thrown in JS)
 * @returns an ApiError, so callers never have to inspect axios internals
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (!axios.isAxiosError(error)) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new ApiError(message, { status: null, code: UNKNOWN_ERROR_CODE });
  }

  // axios sets `response` only when the server answered; a missing one means a network problem.
  if (!error.response) {
    const isTimeout = error.code !== undefined && AXIOS_TIMEOUT_CODES.has(error.code);
    return isTimeout
      ? new ApiError("The server took too long to respond", {
          status: null,
          code: TIMEOUT_ERROR_CODE,
        })
      : new ApiError("Could not reach the server", { status: null, code: NETWORK_ERROR_CODE });
  }

  const { status, data } = error.response;
  if (isApiErrorBody(data)) {
    return new ApiError(data.error.message, {
      status,
      code: data.error.code,
      details: data.error.details,
    });
  }
  // Response without our envelope (e.g. a proxy or host error page).
  return new ApiError(error.message, { status, code: `HTTP_${status}` });
}
