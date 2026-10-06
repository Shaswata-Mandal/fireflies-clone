import { apiClient } from "@/shared/lib/api-client";
import type {
  MeetingDetail,
  MeetingList,
  MeetingsQuery,
  Participant,
} from "@/modules/meetings/types";

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

export async function listParticipants(signal?: AbortSignal): Promise<Participant[]> {
  const { data } = await apiClient.get<{ items: Participant[] }>("/participants", { signal });
  return data.items;
}
