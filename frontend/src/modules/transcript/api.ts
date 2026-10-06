import type { Transcript } from "@/modules/transcript/types";
import { apiClient } from "@/shared/lib/api-client";

export async function getTranscript(meetingId: number, signal?: AbortSignal): Promise<Transcript> {
  const { data } = await apiClient.get<Transcript>(`/meetings/${meetingId}/transcript`, {
    signal,
  });
  return data;
}
