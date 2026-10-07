// The only place that reads environment variables. NEXT_PUBLIC_* values are inlined at build time,
// so each must be accessed with a literal `process.env.NAME` (no dynamic lookups).

const DEV_API_URL = "http://localhost:8000/api/v1";

/** In production a missing value would silently bake localhost into the bundle, so fail the build. */
export function resolveApiUrl(value: string | undefined, nodeEnv: string | undefined): string {
  if (value) return value;
  if (nodeEnv === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Set it to the backend API base URL including /api/v1 " +
        "(e.g. https://your-api.onrender.com/api/v1) in the build environment, then rebuild. " +
        "See frontend/.env.example.",
    );
  }
  return DEV_API_URL;
}

export const env = {
  apiUrl: resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV),
} as const;
