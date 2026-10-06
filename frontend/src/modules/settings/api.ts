import { apiClient } from "@/shared/lib/api-client";
import type { CurrentUser } from "@/modules/settings/types";

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/me");
  return data;
}
