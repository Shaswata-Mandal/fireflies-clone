/**
 * Notes-column tab definitions for the meeting page.
 *
 * WHAT: Tab ids, labels and the parser for the `?tab=` URL value.
 * LAYER: Module constants + tiny util.
 * CALLED BY: `use-notes-tab.ts`, `MeetingNotes`, `NotesTabPanel`.
 * CALLS: nothing.
 * MERN EQUIVALENT: a tab config array plus query-param validation.
 */

// Tabs of the notes column on the meeting page, and the `?tab=` value that remembers the choice.
// Soundbites / Discussion / Bookmarks live in the left tool rail (MeetingRail), not here.

export const NOTES_TAB_PARAM = "tab";

export const NOTES_TABS = {
  NOTES: "notes",
  AI_SKILLS: "ai-skills",
} as const;

export type NotesTabId = (typeof NOTES_TABS)[keyof typeof NOTES_TABS];

export const DEFAULT_NOTES_TAB: NotesTabId = NOTES_TABS.NOTES;

interface NotesTabConfig {
  id: NotesTabId;
  label: string;
  /** Present in Fireflies (screenshot 20) but not built: renders a Coming soon panel. */
  comingSoonDescription?: string;
}

export const NOTES_TAB_CONFIG: ReadonlyArray<NotesTabConfig> = [
  { id: NOTES_TABS.NOTES, label: "Notes" },
  {
    id: NOTES_TABS.AI_SKILLS,
    label: "AI Skills",
    comingSoonDescription:
      "Run AI skills like Key Ideas or Goal Progress to extract specific insights.",
  },
];

// A Set gives fast "is this a known tab?" checks.
const VALID_TABS = new Set<string>(Object.values(NOTES_TABS));

// Type guard: narrows a plain string to `NotesTabId` when it returns true.
function isNotesTabId(value: string): value is NotesTabId {
  return VALID_TABS.has(value);
}

/** Missing or unknown `?tab=` → the Notes tab, so a hand-edited URL never breaks the page. */
export function parseNotesTab(value: string | null): NotesTabId {
  return value !== null && isNotesTabId(value) ? value : DEFAULT_NOTES_TAB;
}
