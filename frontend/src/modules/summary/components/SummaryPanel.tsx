"use client";

import { useState } from "react";
import type { MeetingDetail } from "@/modules/meetings/types";
import { SummaryEditForm } from "@/modules/summary/components/SummaryEditForm";
import { SummaryEmptyState } from "@/modules/summary/components/SummaryEmptyState";
import { SummarySkeleton } from "@/modules/summary/components/SummarySkeleton";
import { SummaryToolbar } from "@/modules/summary/components/SummaryToolbar";
import { SummaryView } from "@/modules/summary/components/SummaryView";
import { useGenerateSummary } from "@/modules/summary/hooks";
import { useTranscript } from "@/modules/transcript/hooks";

interface SummaryPanelProps {
  meeting: MeetingDetail;
}

/**
 * Summary tab: empty state → (generating skeleton) → read view ⇄ inline edit.
 * Whether a transcript exists comes from the transcript query the page already loaded (deduped).
 */
export function SummaryPanel({ meeting }: SummaryPanelProps) {
  const [isEditing, setEditing] = useState(false);
  const generate = useGenerateSummary(meeting.id);
  const transcript = useTranscript(meeting.id);

  const hasTranscript = (transcript.data?.segments.length ?? 0) > 0;
  // Only claim "no transcript" once it has loaded; until then Generate is just disabled.
  const isMissingTranscript = transcript.isSuccess && !hasTranscript;
  const generateSummary = () => generate.mutate();

  if (!meeting.summary) {
    if (generate.isPending) return <SummarySkeleton />;
    return (
      <SummaryEmptyState
        canGenerate={hasTranscript}
        isMissingTranscript={isMissingTranscript}
        onGenerate={generateSummary}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryToolbar
        generatedBy={meeting.summary.generated_by}
        isEditing={isEditing}
        isGenerating={generate.isPending}
        canRegenerate={hasTranscript}
        onEdit={() => setEditing(true)}
        onRegenerate={generateSummary}
      />
      {generate.isPending && <SummarySkeleton />}
      {!generate.isPending && isEditing && (
        <SummaryEditForm
          meetingId={meeting.id}
          summary={meeting.summary}
          onDone={() => setEditing(false)}
        />
      )}
      {!generate.isPending && !isEditing && <SummaryView summary={meeting.summary} />}
    </div>
  );
}
