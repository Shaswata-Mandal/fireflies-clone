/**
 * Raw HTTP calls for action items.
 *
 * WHAT: One typed async function per endpoint (list per meeting, list open across meetings,
 *   create, update, delete).
 * LAYER: Module API layer: components -> hooks.ts -> THIS FILE -> `apiClient` -> backend.
 * CALLED BY: `action-items/hooks.ts` only.
 * CALLS: `shared/lib/api-client.ts` (endpoints per docs/api.md).
 * MERN EQUIVALENT: an `actionItemsApi.js` of axios wrappers.
 */

import type {
  ActionItem,
  ActionItemCreate,
  ActionItemList,
  ActionItemUpdate,
  OpenActionItemList,
} from "@/modules/action-items/types";
import { apiClient } from "@/shared/lib/api-client";

/** GET /meetings/{id}/action-items; unwraps `{ items }` so callers get a plain array. */
export async function listActionItems(
  meetingId: number,
  signal?: AbortSignal,
): Promise<ActionItem[]> {
  const { data } = await apiClient.get<ActionItemList>(`/meetings/${meetingId}/action-items`, {
    signal,
  });
  return data.items;
}

/** The current user's open items across all meetings (Home dashboard). */
export async function listOpenActionItems(
  limit: number,
  signal?: AbortSignal,
): Promise<OpenActionItemList> {
  const { data } = await apiClient.get<OpenActionItemList>("/action-items", {
    params: { status: "open", limit },
    signal,
  });
  return data;
}

/** POST /meetings/{id}/action-items (201 + the created item). */
export async function createActionItem(
  meetingId: number,
  body: ActionItemCreate,
): Promise<ActionItem> {
  const { data } = await apiClient.post<ActionItem>(`/meetings/${meetingId}/action-items`, body);
  return data;
}

/** PATCH /action-items/{id}: also used to tick/untick completion (`is_completed`). */
export async function updateActionItem(id: number, body: ActionItemUpdate): Promise<ActionItem> {
  const { data } = await apiClient.patch<ActionItem>(`/action-items/${id}`, body);
  return data;
}

/** DELETE /action-items/{id} (204, no body). */
export async function deleteActionItem(id: number): Promise<void> {
  await apiClient.delete(`/action-items/${id}`);
}
