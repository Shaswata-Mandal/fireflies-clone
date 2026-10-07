/**
 * Tab bar of the create form.
 *
 * WHAT: Configures the shared `TabList` with this form's three tabs.
 * LAYER: Module component (client).
 * CALLED BY: `CreateMeetingForm`.
 * CALLS: `shared/components/TabList`.
 */

"use client";

import { CREATE_TAB_ITEMS, type CreateTab } from "@/modules/meetings/constants";
import { TabList } from "@/shared/components/TabList";

interface CreateMeetingTabsProps {
  idPrefix: string;
  activeTab: CreateTab;
  onChange: (tab: CreateTab) => void;
}

/** "Upload file | Paste transcript | Manual form" using the shared accessible tablist. */
export function CreateMeetingTabs({ idPrefix, activeTab, onChange }: CreateMeetingTabsProps) {
  return (
    <TabList
      tabs={CREATE_TAB_ITEMS}
      activeId={activeTab}
      onChange={onChange}
      idPrefix={idPrefix}
      label="How to add the meeting"
      variant="segmented"
      className="self-start"
    />
  );
}
