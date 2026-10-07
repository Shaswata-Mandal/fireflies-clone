"use client";

import { NotesTabPanel } from "@/modules/meetings/components/NotesTabPanel";
import { NOTES_TAB_CONFIG, NOTES_TABS, type NotesTabId } from "@/modules/meetings/notes-tabs";
import type { MeetingDetail } from "@/modules/meetings/types";
import { useNotesTab } from "@/modules/meetings/use-notes-tab";
import {
  TabList,
  tabElementId,
  tabPanelElementId,
  type TabItem,
} from "@/shared/components/TabList";

interface MeetingNotesProps {
  meeting: MeetingDetail;
}

const ID_PREFIX = "notes";

/** Divider before the first placeholder tab, separating built features from "Coming soon" ones. */
const TABS: ReadonlyArray<TabItem<NotesTabId>> = NOTES_TAB_CONFIG.map(({ id, label }) => ({
  id,
  label,
  separatorBefore: id === NOTES_TABS.AI_SKILLS,
}));

/**
 * The Notes area of 17: a segmented tablist (styled like "Notes | AI Skills") and the selected
 * panel. In Fireflies this is the centre column; ours sits left of the transcript.
 */
export function MeetingNotes({ meeting }: MeetingNotesProps) {
  const [activeTab, setActiveTab] = useNotesTab();

  return (
    <section aria-label="Meeting notes" className="flex flex-col gap-6">
      <TabList
        tabs={TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        idPrefix={ID_PREFIX}
        label="Meeting notes"
        variant="segmented"
        className="self-start"
      />
      <div
        role="tabpanel"
        id={tabPanelElementId(ID_PREFIX, activeTab)}
        aria-labelledby={tabElementId(ID_PREFIX, activeTab)}
      >
        <NotesTabPanel tab={activeTab} meeting={meeting} />
      </div>
    </section>
  );
}
