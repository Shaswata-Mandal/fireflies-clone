import { apiClient } from "@/shared/lib/api-client";
import type {
  AskBody,
  AskResponse,
  ExportedFile,
  ExportFormat,
  MeetingDetail,
  MeetingCreateBody,
  MeetingList,
  MeetingsQuery,
  MeetingUpdateBody,
  MeetingUploadInput,
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

export async function createMeeting(body: MeetingCreateBody): Promise<MeetingDetail> {
  const { data } = await apiClient.post<MeetingDetail>("/meetings", body);
  return data;
}

/** Multipart: the API takes `participants` as a JSON string and booleans as form text. */
export async function uploadMeeting(input: MeetingUploadInput): Promise<MeetingDetail> {
  const form = new FormData();
  form.append("title", input.title);
  form.append("meeting_date", input.meeting_date);
  form.append("participants", JSON.stringify(input.participants));
  form.append("generate_summary", String(input.generate_summary));
  form.append("file", input.file);
  // No Content-Type header: the browser must add the multipart boundary itself.
  const { data } = await apiClient.post<MeetingDetail>("/meetings/upload", form);
  return data;
}

export async function updateMeeting(id: number, body: MeetingUpdateBody): Promise<MeetingDetail> {
  const { data } = await apiClient.patch<MeetingDetail>(`/meetings/${id}`, body);
  return data;
}

export async function deleteMeeting(id: number): Promise<void> {
  await apiClient.delete(`/meetings/${id}`);
}

/** Question across all of the user's meetings (home AskFred). */
export async function askWorkspace(body: AskBody): Promise<AskResponse> {
  const { data } = await apiClient.post<AskResponse>("/ask", body);
  return data;
}

export async function askMeeting(id: number, body: AskBody): Promise<AskResponse> {
  const { data } = await apiClient.post<AskResponse>(`/meetings/${id}/ask`, body);
  return data;
}
