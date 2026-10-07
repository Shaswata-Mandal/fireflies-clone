/**
 * Toolbar above the summary.
 *
 * WHAT: Source badge plus Edit and Regenerate buttons, with the disabled rules.
 * LAYER: Module component (server-safe: only calls the callbacks it receives).
 * CALLED BY: `SummaryPanel`.
 * CALLS: `GeneratedByBadge`, `Button`.
 */

import { Pencil, RotateCw } from "lucide-react";
import type { GeneratedBy } from "@/modules/meetings/types";
import { GeneratedByBadge } from "@/modules/summary/components/GeneratedByBadge";
import { SUMMARY_COPY } from "@/modules/summary/constants";
import { Button } from "@/shared/components/ui/button";

interface SummaryToolbarProps {
  generatedBy: GeneratedBy;
  isEditing: boolean;
  isGenerating: boolean;
  canRegenerate: boolean;
  onEdit: () => void;
  onRegenerate: () => void;
}

const EDIT_LABEL = "Edit";
const NO_TRANSCRIPT_HINT = SUMMARY_COPY.NO_TRANSCRIPT_BODY;

/** Source badge on the left; Edit and Regenerate on the right. */
export function SummaryToolbar({
  generatedBy,
  isEditing,
  isGenerating,
  canRegenerate,
  onEdit,
  onRegenerate,
}: SummaryToolbarProps) {
  // Regenerating while editing would silently replace the text being edited.
  const isRegenerateDisabled = !canRegenerate || isGenerating || isEditing;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <GeneratedByBadge generatedBy={generatedBy} />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isEditing || isGenerating}
          aria-label="Edit summary"
        >
          <Pencil aria-hidden="true" />
          {EDIT_LABEL}
        </Button>
        <Button
          variant="outline"
          onClick={onRegenerate}
          disabled={isRegenerateDisabled}
          aria-busy={isGenerating}
          title={canRegenerate ? undefined : NO_TRANSCRIPT_HINT}
        >
          <RotateCw className={isGenerating ? "animate-spin" : undefined} aria-hidden="true" />
          {isGenerating ? SUMMARY_COPY.GENERATING : SUMMARY_COPY.REGENERATE}
        </Button>
      </div>
    </div>
  );
}
