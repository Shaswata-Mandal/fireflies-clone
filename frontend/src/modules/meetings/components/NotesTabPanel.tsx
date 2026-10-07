import { AudioLines, Bookmark, MessageSquare, Sparkles, type LucideIcon } from "lucide-react";
import { ActionItemsPanel } from "@/modules/action-items/components/ActionItemsPanel";
import { NOTES_TABS, NOTES_TAB_CONFIG, type NotesTabId } from "@/modules/meetings/notes-tabs";
import type { MeetingDetail } from "@/modules/meetings/types";
import { OutlineList } from "@/modules/summary/components/OutlineList";
import { SummaryPanel } from "@/modules/summary/components/SummaryPanel";
import { ComingSoonPanel } from "@/shared/components/ComingSoonPanel";

interface NotesTabPanelProps {
  tab: NotesTabId;
  meeting: MeetingDetail;
}

/** Icons of the placeholder tabs, matching the 17 icon rail and the AI Skills sparkle (20). */
const COMING_SOON_ICONS: Partial<Record<NotesTabId, LucideIcon>> = {
  [NOTES_TABS.AI_SKILLS]: Sparkles,
  [NOTES_TABS.SOUNDBITES]: AudioLines,
  [NOTES_TABS.DISCUSSION]: MessageSquare,
  [NOTES_TABS.BOOKMARKS]: Bookmark,
};

/** Content of the selected notes tab. */
export function NotesTabPanel({ tab, meeting }: NotesTabPanelProps) {
  switch (tab) {
    case NOTES_TABS.SUMMARY:
      return <SummaryPanel meeting={meeting} />;
    case NOTES_TABS.ACTION_ITEMS:
      return <ActionItemsPanel meetingId={meeting.id} participants={meeting.participants} />;
    case NOTES_TABS.OUTLINE:
      return <OutlineList chapters={meeting.chapters} />;
    default: {
      const config = NOTES_TAB_CONFIG.find((entry) => entry.id === tab);
      if (!config?.comingSoonDescription) return null;
      return (
        <ComingSoonPanel
          icon={COMING_SOON_ICONS[tab] ?? Sparkles}
          title={config.label}
          description={config.comingSoonDescription}
        />
      );
    }
  }
}
