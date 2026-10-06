import { apiClient } from "@/shared/lib/api-client";
import type {
  ExportedFile,
  ExportFormat,
  MeetingDetail,
  MeetingList,
  MeetingsQuery,
  Participant,
} from "@/modules/meetings/types";
import { filenameFromContentDisposition } from "@/shared/utils/download";

export async function listMeetings(
  query: MeetingsQuery,
  signal?: AbortSignal,
): Promise<MeetingList> {
  // axios drops undefined params, so unset filters never reach the URL.
  const { data } = await apiClient.get<MeetingList>("/meetings", { params: query, signal });
  return data;
}

export async function getMeeting(id: number, signal?: AbortSignal): Promise<MeetingDetail> {
  const { data } = await apiClient.get<MeetingDetail>(`/meetings/${id}`, { signal });
  return data;
}

/** The file body plus the server-chosen name (slugified title); falls back to `meeting-<id>`. */
export async function exportMeeting(id: number, format: ExportFormat): Promise<ExportedFile> {
  const response = await apiClient.get<Blob>(`/meetings/${id}/export`, {
    params: { format },
    responseType: "blob",
  });
  const header = response.headers["content-disposition"];
  const filename =
    filenameFromContentDisposition(typeof header === "string" ? header : null) ??
    `meeting-${id}.${format}`;
  return { blob: response.data, filename };
}

export async function listParticipants(signal?: AbortSignal): Promise<Participant[]> {
  const { data } = await apiClient.get<{ items: Participant[] }>("/participants", { signal });
  return data.items;
}
