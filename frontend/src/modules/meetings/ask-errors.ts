/**
 * Turns a failed "ask" request into a friendly inline message.
 *
 * WHAT: Maps backend error codes (no API key, rate limit, anything else) to text and a retry flag.
 * LAYER: Module util (pure; unit-tested).
 * CALLED BY: `use-ask-chat.ts`, shown by `AskErrorNotice`.
 * CALLS: `isApiError`, `ASK_COPY`.
 * MERN EQUIVALENT: a switch on `err.response.data.code` in a catch block.
 */

import { ASK_COPY } from "@/modules/meetings/constants";
import { isApiError } from "@/shared/lib/api-error";

// Codes returned by POST /meetings/{id}/ask (docs/api.md → Ask).
const CODE_NOT_CONFIGURED = "LLM_NOT_CONFIGURED";
const CODE_RATE_LIMITED = "LLM_RATE_LIMITED";

export interface AskErrorView {
  message: string;
  /** Only worth retrying right away when the failure was not a missing key or a rate limit. */
  canRetry: boolean;
}

/** Reads `details.retry_after` safely from an `unknown` value; falls back to a default. */
function retryAfterSeconds(details: unknown): number {
  if (typeof details === "object" && details !== null && "retry_after" in details) {
    const { retry_after: value } = details;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.ceil(value);
  }
  return ASK_COPY.RATE_LIMITED_FALLBACK_SECONDS;
}

/** Turns a failed ask into the inline message the panel shows. */
// @param error whatever the mutation rejected with; @returns the message and whether to offer Retry
export function describeAskError(error: unknown): AskErrorView {
  if (isApiError(error) && error.code === CODE_NOT_CONFIGURED) {
    return { message: ASK_COPY.NOT_CONFIGURED, canRetry: false };
  }
  if (isApiError(error) && error.code === CODE_RATE_LIMITED) {
    const seconds = retryAfterSeconds(error.details);
    const unit = seconds === 1 ? "second" : "seconds";
    return { message: `AskFred is busy. Try again in ${seconds} ${unit}.`, canRetry: false };
  }
  return { message: ASK_COPY.GENERIC_ERROR, canRetry: true };
}
