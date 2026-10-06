// The only place that reads environment variables. NEXT_PUBLIC_* values are inlined at build time,
// so each must be accessed with a literal `process.env.NAME` (no dynamic lookups).

const DEFAULT_API_URL = "http://localhost:8000/api/v1";

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL,
} as const;
