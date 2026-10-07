/**
 * TanStack Query hooks for meetings.
 *
 * WHAT: `useQuery` hooks for reading and `useMutation` hooks for create / update / delete /
 *   export / ask, including cache invalidation and an optimistic delete.
 * LAYER: Module hooks layer: components -> THIS FILE -> `api.ts`.
 * CALLED BY: meetings components (list, detail, forms, row actions, ask chat).
 * CALLS: `meetings/api.ts`, `shared/constants/query-keys.ts`, toasts.
 * MERN EQUIVALENT: RTK Query endpoints, or `useEffect + fetch + useState` replaced by one hook.
 * INTERVIEW: read vs write. `useQuery` = server state with a cache key; `useMutation` = a write
 * that then invalidates the keys whose data it changed, so lists and details refetch themselves.
 */

"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  askMeeting,
  askWorkspace,
  createMeeting,
  deleteMeeting,
  exportMeeting,
  getMeeting,
  listMeetings,
  listParticipants,
  updateMeeting,
  uploadMeeting,
} from "@/modules/meetings/api";
import { FORM_COPY } from "@/modules/meetings/constants";
import type {
  AskBody,
  ExportFormat,
  MeetingCreateBody,
  MeetingList,
  MeetingsQuery,
  MeetingUpdateBody,
  MeetingUploadInput,
} from "@/modules/meetings/types";
import { queryKeys } from "@/shared/constants/query-keys";
import { downloadBlob } from "@/shared/utils/download";
import { showSuccessToast } from "@/shared/utils/toast";

// Participants change rarely, so they stay "fresh" for five minutes instead of the default 30 s.
const PARTICIPANTS_STALE_TIME_MS = 5 * 60_000;

/** One page of the meetings library. Each filter combination is its own cache entry. */
export function useMeetings(query: MeetingsQuery) {
  return useQuery({
    // The key includes `query`, so changing a filter or page = a different cache entry + refetch.
    queryKey: queryKeys.meetings.list(query),
    // TanStack passes an AbortSignal; forwarding it cancels the HTTP call when the key changes.
    queryFn: ({ signal }) => listMeetings(query, signal),
    // Keep showing the old page while the next filter/page loads instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

/** Full meeting (participants with email/role, summary…). `enabled` lets popups fetch lazily. */
// @param enabled false = do not fetch yet (e.g. a popup that has not been opened)
export function useMeeting(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.meetings.detail(id),
    queryFn: ({ signal }) => getMeeting(id, signal),
    enabled,
  });
}

/** Everyone who attends one of the user's meetings (filter dropdown). Changes rarely. */
export function useParticipants() {
  return useQuery({
    queryKey: queryKeys.participants.all,
    queryFn: ({ signal }) => listParticipants(signal),
    staleTime: PARTICIPANTS_STALE_TIME_MS,
  });
}

/**
 * Downloads a meeting as Markdown or plain text. A mutation (not a query): it's a user-triggered
 * action with nothing to cache. Errors are toasted by the global MutationCache.
 */
export function useExportMeeting() {
  return useMutation({
    // `mutate({ id, format })` passes exactly one argument; destructuring unpacks it.
    mutationFn: ({ id, format }: { id: number; format: ExportFormat }) => exportMeeting(id, format),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
      toast.success(`Downloaded ${filename}`);
    },
  });
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------
// Error toasts come from the global MutationCache handler; the create form additionally shows the
// mapped errors inline. Success toasts that need navigation ("View meeting") are shown by the form.

/** A new meeting changes the library, may add people to the participant filter, and may bring action items. */
async function refreshAfterCreate(queryClient: QueryClient): Promise<void> {
  // `invalidateQueries` marks the keys stale and refetches the ones currently on screen.
  // `Promise.all` runs the three invalidations in parallel and waits for all of them.
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.participants.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all }),
  ]);
}

/** Create from the paste / manual tabs (JSON body). */
export function useCreateMeeting() {
  // `useQueryClient` returns the cache instance created in Providers.tsx.
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingCreateBody) => createMeeting(body),
    onSuccess: () => refreshAfterCreate(queryClient),
  });
}

/** Create from the upload tab (multipart). */
export function useUploadMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MeetingUploadInput) => uploadMeeting(input),
    onSuccess: () => refreshAfterCreate(queryClient),
  });
}

/** Edit title / date / participants of meeting `id`. */
export function useUpdateMeeting(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingUpdateBody) => updateMeeting(id, body),
    onSuccess: async (meeting) => {
      // The PATCH response is the full MeetingDetail, so the detail page updates without a refetch.
      // `setQueryData` writes straight into the cache (no network), so the page updates at once.
      queryClient.setQueryData(queryKeys.meetings.detail(id), meeting);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.participants.all }),
      ]);
      showSuccessToast(FORM_COPY.UPDATED);
    },
  });
}

/** What `onMutate` hands to `onError`: every cached library page as it was, to roll back to. */
interface ListSnapshot {
  previous: Array<[readonly unknown[], MeetingList | undefined]>;
}

/**
 * Delete is optimistic: the row leaves every cached library page immediately and comes back if the
 * server refuses. On success the meeting's own caches are removed (not invalidated): a still-open
 * detail page would otherwise refetch a 404 and flash "not found" before navigating away.
 */
// INTERVIEW: optimistic update, step by step.
//   onMutate  -> cancel in-flight fetches, snapshot the cache, edit the cache (UI updates now)
//   onError   -> restore the snapshot (rollback)
//   onSuccess -> clean up related caches and toast
//   onSettled -> runs on success OR error: refetch the real server state to be safe
export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMeeting(id),
    onMutate: async (id): Promise<ListSnapshot> => {
      const listsKey = queryKeys.meetings.lists();
      // An in-flight refetch would overwrite the optimistic removal with stale data.
      await queryClient.cancelQueries({ queryKey: listsKey });
      // Snapshot every cached library page (there is one per filter/page combination).
      const previous = queryClient.getQueriesData<MeetingList>({ queryKey: listsKey });
      queryClient.setQueriesData<MeetingList>({ queryKey: listsKey }, (page) =>
        page && page.items.some((item) => item.id === id)
          ? { ...page, items: page.items.filter((item) => item.id !== id), total: page.total - 1 }
          : page,
      );
      return { previous };
    },
    // The third argument is whatever `onMutate` returned, i.e. our snapshot.
    onError: (_error, _id, snapshot) => {
      snapshot?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.meetings.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.actionItems.byMeeting(id) });
      showSuccessToast(FORM_COPY.DELETED);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.participants.all }),
        // Cross-meeting "my tasks" lists include this meeting's items.
        queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all }),
      ]);
    },
  });
}

/**
 * Asks a question about one meeting, or across all meetings when `meetingId` is null. The panel shows failures inline (with a retry), so the global
 * error toast is switched off for this mutation. Nothing is cached or invalidated: a chat turn is
 * not server state.
 */
// @param meetingId a meeting id, or null for the cross-meeting (global) assistant
export function useAskMeeting(meetingId: number | null) {
  return useMutation({
    mutationFn: (body: AskBody) =>
      meetingId === null ? askWorkspace(body) : askMeeting(meetingId, body),
    meta: { suppressErrorToast: true },
  });
}
