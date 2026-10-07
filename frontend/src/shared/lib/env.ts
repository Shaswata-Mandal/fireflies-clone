/**
 * Typed access to environment variables.
 *
 * WHAT: Exposes `env.apiUrl` (the backend base URL) and fails the production build if it is unset.
 * LAYER: Shared library.
 * CALLED BY: `api-client.ts` and `next.config.ts` (so a bad build fails early).
 * CALLS: nothing (reads `process.env`).
 * MERN EQUIVALENT: `process.env.REACT_APP_API_URL` in CRA, `import.meta.env.VITE_API_URL` in Vite.
 */

// The only place that reads environment variables. NEXT_PUBLIC_* values are inlined at build time,
// so each must be accessed with a literal `process.env.NAME` (no dynamic lookups).

const DEV_API_URL = "http://localhost:8000/api/v1";

/**
 * In production a missing value would silently bake localhost into the bundle, so fail the build.
 *
 * @param value the raw `NEXT_PUBLIC_API_URL`, possibly undefined
 * @param nodeEnv `process.env.NODE_ENV` ("development" | "test" | "production")
 * @returns the API base URL to use
 * (Split out as a pure function so the unit tests can try every combination.)
 */
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

// INTERVIEW: Next.js replaces `process.env.NEXT_PUBLIC_API_URL` with its literal value at BUILD
// time, so changing it needs a rebuild, not a restart. Hence "NEXT_PUBLIC_" (exposed to browser).
export const env = {
  apiUrl: resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV),
} as const;
