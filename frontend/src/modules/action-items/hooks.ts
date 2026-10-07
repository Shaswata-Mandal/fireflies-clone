"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createActionItem,
  deleteActionItem,
  listActionItems,
  updateActionItem,
} from "@/modules/action-items/api";
import { ACTION_ITEMS_COPY } from "@/modules/action-items/constants";
import type { ActionItem, ActionItemCreate, ActionItemUpdate } from "@/modules/action-items/types";
import { queryKeys } from "@/shared/constants/query-keys";
import { isApiError } from "@/shared/lib/api-error";

const HTTP_NOT_FOUND = 404;
const FALLBACK_ERROR_MESSAGE = "Something went wrong";

/** What `onMutate` hands to `onError`: the list as it was, to roll back to. */
interface CacheSnapshot {
  previous: ActionItem[] | undefined;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Server truth after any change: this meeting's list, plus the library's open-items count. */
async function refreshAfterChange(queryClient: QueryClient, meetingId: number): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.byMeeting(meetingId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() }),
  ]);
}

/**
 * Item mutations opt out of the global error toast so a 404 (deleted in another tab) can say so
 * plainly; the list is refreshed by `onSettled` either way.
 */
function toastItemError(error: unknown): void {
  if (isApiError(error) && error.status === HTTP_NOT_FOUND) {
    toast.error(ACTION_ITEMS_COPY.GONE);
    return;
  }
  toast.error(isApiError(error) ? error.message : FALLBACK_ERROR_MESSAGE);
}

/** Cancels in-flight refetches (they'd overwrite the optimistic value), snapshots, then patches. */
async function patchListOptimistically(
  queryClient: QueryClient,
  meetingId: number,
  patch: (items: ActionItem[]) => ActionItem[],
): Promise<CacheSnapshot> {
  const queryKey = queryKeys.actionItems.byMeeting(meetingId);
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<ActionItem[]>(queryKey);
  if (previous) queryClient.setQueryData<ActionItem[]>(queryKey, patch(previous));
  return { previous };
}

function rollback(queryClient: QueryClient, meetingId: number, snapshot?: CacheSnapshot): void {
  if (snapshot?.previous) {
    queryClient.setQueryData(queryKeys.actionItems.byMeeting(meetingId), snapshot.previous);
  }
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export function useActionItems(meetingId: number) {
  return useQuery({
    queryKey: queryKeys.actionItems.byMeeting(meetingId),
    queryFn: ({ signal }) => listActionItems(meetingId, signal),
  });
}

// ---------------------------------------------------------------------------
// Mutations that wait for the server (add, edit)
// ---------------------------------------------------------------------------

export function useCreateActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ActionItemCreate) => createActionItem(meetingId, body),
    onSuccess: async () => {
      await refreshAfterChange(queryClient, meetingId);
      toast.success(ACTION_ITEMS_COPY.CREATED);
    },
  });
}

export function useUpdateActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ActionItemUpdate }) =>
      updateActionItem(id, body),
    meta: { suppressErrorToast: true },
    onSuccess: () => toast.success(ACTION_ITEMS_COPY.UPDATED),
    onError: toastItemError,
    onSettled: () => refreshAfterChange(queryClient, meetingId),
  });
}

// ---------------------------------------------------------------------------
// Optimistic mutations (toggle, delete): UI first, roll back on failure
// ---------------------------------------------------------------------------

export function useToggleActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      updateActionItem(id, { is_completed: isCompleted }),
    meta: { suppressErrorToast: true },
    onMutate: ({ id, isCompleted }) =>
      patchListOptimistically(queryClient, meetingId, (items) =>
        items.map((item) => (item.id === id ? { ...item, is_completed: isCompleted } : item)),
      ),
    onError: (error, _variables, snapshot) => {
      rollback(queryClient, meetingId, snapshot);
      toastItemError(error);
    },
    onSettled: () => refreshAfterChange(queryClient, meetingId),
  });
}

export function useDeleteActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteActionItem(id),
    meta: { suppressErrorToast: true },
    onMutate: (id) =>
      patchListOptimistically(queryClient, meetingId, (items) =>
        items.filter((item) => item.id !== id),
      ),
    onSuccess: () => toast.success(ACTION_ITEMS_COPY.DELETED),
    onError: (error, _id, snapshot) => {
      // Already gone on the server: the optimistic removal was right, so don't bring it back.
      const alreadyGone = isApiError(error) && error.status === HTTP_NOT_FOUND;
      if (!alreadyGone) rollback(queryClient, meetingId, snapshot);
      toastItemError(error);
    },
    onSettled: () => refreshAfterChange(queryClient, meetingId),
  });
}
