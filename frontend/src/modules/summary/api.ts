import type { MeetingSummary } from "@/modules/meetings/types";
import type {
  GenerateSummaryRequest,
  GenerateSummaryResponse,
  SummaryUpdate,
} from "@/modules/summary/types";
import { apiClient } from "@/shared/lib/api-client";

/**
 * Generation runs the LLM when one is configured, which can take far longer than an ordinary
 * request; give it its own timeout instead of the client-wide one.
 */
const GENERATE_TIMEOUT_MS = 60_000;

export async function generateSummary(
  meetingId: number,
  body: GenerateSummaryRequest,
): Promise<GenerateSummaryResponse> {
  const { data } = await apiClient.post<GenerateSummaryResponse>(
    `/meetings/${meetingId}/summary/generate`,
    body,
    { timeout: GENERATE_TIMEOUT_MS },
  );
  return data;
}

export async function updateSummary(
  meetingId: number,
  body: SummaryUpdate,
): Promise<MeetingSummary> {
  const { data } = await apiClient.patch<MeetingSummary>(`/meetings/${meetingId}/summary`, body);
  return data;
}
