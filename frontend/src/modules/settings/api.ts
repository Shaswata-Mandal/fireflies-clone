/**
 * Raw HTTP call for the current user.
 *
 * WHAT: Fetches `GET /me`, the seeded default user (there is no real auth).
 * LAYER: Module API layer: components -> hooks.ts -> THIS FILE -> `apiClient`.
 * CALLED BY: `settings/hooks.ts`.
 * CALLS: `shared/lib/api-client.ts`.
 */

import { apiClient } from "@/shared/lib/api-client";
import type { CurrentUser } from "@/modules/settings/types";

/** GET /me. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/me");
  return data;
}
