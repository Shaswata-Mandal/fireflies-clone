import axios from "axios";

// ---------------------------------------------------------------------------
// Error codes produced on the client (the backend's own codes come from the response body)
// ---------------------------------------------------------------------------

export const NETWORK_ERROR_CODE = "NETWORK_ERROR";
export const TIMEOUT_ERROR_CODE = "TIMEOUT";
export const UNKNOWN_ERROR_CODE = "UNKNOWN_ERROR";

const AXIOS_TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

/** Envelope the backend returns for every error (backend/app/core/exceptions.py, docs/api.md). */
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

  constructor(message: string, { status, code, details = null }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Type guard so hooks/components can narrow an `unknown` error without casting. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

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

/** Converts anything a request can throw into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (!axios.isAxiosError(error)) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new ApiError(message, { status: null, code: UNKNOWN_ERROR_CODE });
  }

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
