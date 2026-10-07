import type {
  ActionItem,
  ActionItemCreate,
  ActionItemList,
  ActionItemUpdate,
  OpenActionItemList,
} from "@/modules/action-items/types";
import { apiClient } from "@/shared/lib/api-client";

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

export async function createActionItem(
  meetingId: number,
  body: ActionItemCreate,
): Promise<ActionItem> {
  const { data } = await apiClient.post<ActionItem>(`/meetings/${meetingId}/action-items`, body);
  return data;
}

export async function updateActionItem(id: number, body: ActionItemUpdate): Promise<ActionItem> {
  const { data } = await apiClient.patch<ActionItem>(`/action-items/${id}`, body);
  return data;
}

export async function deleteActionItem(id: number): Promise<void> {
  await apiClient.delete(`/action-items/${id}`);
}
