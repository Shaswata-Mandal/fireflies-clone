import { Sparkles } from "lucide-react";
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

interface NotesSectionProps {
  title: string;
  children: React.ReactNode;
}

function NotesSection({ title, children }: NotesSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-primary">{title}</h2>
      {children}
    </section>
  );
}

/** Content of the selected notes tab. */
export function NotesTabPanel({ tab, meeting }: NotesTabPanelProps) {
  if (tab === NOTES_TABS.NOTES) {
    return (
      <div className="flex flex-col gap-8">
        <NotesSection title="Summary">
          <SummaryPanel meeting={meeting} />
        </NotesSection>
        <NotesSection title="Action Items">
          <ActionItemsPanel meetingId={meeting.id} participants={meeting.participants} />
        </NotesSection>
        <NotesSection title="Outline">
          <OutlineList chapters={meeting.chapters} />
        </NotesSection>
      </div>
    );
  }

  const config = NOTES_TAB_CONFIG.find((entry) => entry.id === tab);
  if (!config?.comingSoonDescription) return null;
  return (
    <ComingSoonPanel icon={Sparkles} title={config.label} description={config.comingSoonDescription} />
  );
}
