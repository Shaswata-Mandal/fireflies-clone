/**
 * TanStack Query hooks for action items.
 *
 * WHAT: A query for a meeting's items and mutations to add, edit, tick/untick and delete them.
 *   Ticking and deleting are OPTIMISTIC: the screen changes first, and rolls back on failure.
 * LAYER: Module hooks layer: components -> THIS FILE -> `api.ts`.
 * CALLED BY: `ActionItemsPanel`, `ActionItemRow`, `SmartSearchPanel` and the Home dashboard.
 * CALLS: `action-items/api.ts`, `shared/constants/query-keys.ts`, toasts.
 * MERN EQUIVALENT: RTK Query with `onQueryStarted` optimistic updates.
 * INTERVIEW: the optimistic-update recipe, used by `useToggleActionItem`:
 *   1. onMutate  - cancel in-flight refetches, snapshot the cache, write the new value to it.
 *   2. onError   - restore the snapshot (rollback) and show a message.
 *   3. onSettled - always refetch, so the cache ends up equal to the server's truth.
 */

"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createActionItem,
  deleteActionItem,
  listActionItems,
  listOpenActionItems,
  updateActionItem,
} from "@/modules/action-items/api";
import { ACTION_ITEMS_COPY } from "@/modules/action-items/constants";
import type {
  ActionItem,
  ActionItemCreate,
  ActionItemUpdate,
  OpenActionItemList,
} from "@/modules/action-items/types";
import { queryKeys } from "@/shared/constants/query-keys";
import { isApiError } from "@/shared/lib/api-error";

const HTTP_NOT_FOUND = 404;
const FALLBACK_ERROR_MESSAGE = "Something went wrong";

// The object `onMutate` returns is passed to `onError` as its third argument ("context").
/** What `onMutate` hands to `onError`: the list as it was, to roll back to. */
interface CacheSnapshot {
  previous: ActionItem[] | undefined;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Server truth after any change: this meeting's list, plus the library's open-items count. */
async function refreshAfterChange(queryClient: QueryClient, meetingId: number): Promise<void> {
  // Two invalidations in parallel: this meeting's items, and the library cards (open-item badge).
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
// @param patch a pure function from the old list to the new list (it must not mutate the old one)
// @returns the snapshot that `onError` needs for a rollback
async function patchListOptimistically(
  queryClient: QueryClient,
  meetingId: number,
  patch: (items: ActionItem[]) => ActionItem[],
): Promise<CacheSnapshot> {
  const queryKey = queryKeys.actionItems.byMeeting(meetingId);
  await queryClient.cancelQueries({ queryKey });
  // Step 1: remember the current cache value, so we can undo.
  const previous = queryClient.getQueryData<ActionItem[]>(queryKey);
  // Step 2: write the optimistic value; every component reading this key re-renders immediately.
  if (previous) queryClient.setQueryData<ActionItem[]>(queryKey, patch(previous));
  return { previous };
}

/** Puts the snapshot back into the cache (the "undo" half of an optimistic update). */
function rollback(queryClient: QueryClient, meetingId: number, snapshot?: CacheSnapshot): void {
  if (snapshot?.previous) {
    queryClient.setQueryData(queryKeys.actionItems.byMeeting(meetingId), snapshot.previous);
  }
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** The action items of one meeting. Cached under `["action-items", "meeting", id]`. */
export function useActionItems(meetingId: number) {
  return useQuery({
    queryKey: queryKeys.actionItems.byMeeting(meetingId),
    queryFn: ({ signal }) => listActionItems(meetingId, signal),
  });
}

// ---------------------------------------------------------------------------
// Mutations that wait for the server (add, edit)
// ---------------------------------------------------------------------------

/** Add an item. Not optimistic: we need the server's id and position first. */
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

/** Edit an item's text, assignee or due date. */
export function useUpdateActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ActionItemUpdate }) =>
      updateActionItem(id, body),
    // Opt out of the global error toast: `toastItemError` shows a more specific message.
    meta: { suppressErrorToast: true },
    onSuccess: () => toast.success(ACTION_ITEMS_COPY.UPDATED),
    onError: toastItemError,
    onSettled: () => refreshAfterChange(queryClient, meetingId),
  });
}

// ---------------------------------------------------------------------------
// Optimistic mutations (toggle, delete): UI first, roll back on failure
// ---------------------------------------------------------------------------

/** Tick / untick completion with an optimistic update (the checkbox responds instantly). */
export function useToggleActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      updateActionItem(id, { is_completed: isCompleted }),
    meta: { suppressErrorToast: true },
    // `map` + object spread builds a NEW list with one NEW item (never mutate cached data).
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

/** Delete with an optimistic update: the row disappears at once. */
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

// ---------------------------------------------------------------------------
// Cross-meeting "open items" (Home dashboard)
// ---------------------------------------------------------------------------

/** The user's open items across all meetings (first `limit`), for the Home dashboard. */
export function useOpenActionItems(limit: number) {
  return useQuery({
    queryKey: queryKeys.actionItems.open(limit),
    queryFn: ({ signal }) => listOpenActionItems(limit, signal),
  });
}

/**
 * Same optimistic toggle as the meeting page, but against the dashboard list: the row shows as done
 * (and the open count drops) at once; the refetch in `onSettled` then removes it for good.
 */
export function useToggleOpenActionItem(limit: number) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.actionItems.open(limit);
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      updateActionItem(id, { is_completed: isCompleted }),
    meta: { suppressErrorToast: true },
    // Same recipe as the toggle above, but on the dashboard's list shape ({items, total,...}),
    // so it also adjusts `total`.
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<OpenActionItemList>(queryKey);
      if (previous) {
        queryClient.setQueryData<OpenActionItemList>(queryKey, {
          ...previous,
          total: Math.max(0, previous.total + (isCompleted ? -1 : 1)),
          items: previous.items.map((item) =>
            item.id === id ? { ...item, is_completed: isCompleted } : item,
          ),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toastItemError(error);
    },
    // `all` covers this list and every per-meeting list; the library's open counts change too.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() }),
      ]),
  });
}
