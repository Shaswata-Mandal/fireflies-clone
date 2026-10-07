// Tabs of the notes column on the meeting page, and the `?tab=` value that remembers the choice.

export const NOTES_TAB_PARAM = "tab";

export const NOTES_TABS = {
  SUMMARY: "summary",
  ACTION_ITEMS: "action-items",
  OUTLINE: "outline",
  AI_SKILLS: "ai-skills",
  SOUNDBITES: "soundbites",
  DISCUSSION: "discussion",
  BOOKMARKS: "bookmarks",
} as const;

export type NotesTabId = (typeof NOTES_TABS)[keyof typeof NOTES_TABS];

export const DEFAULT_NOTES_TAB: NotesTabId = NOTES_TABS.SUMMARY;

interface NotesTabConfig {
  id: NotesTabId;
  label: string;
  /** Present in Fireflies (screenshots 20, 24–26) but not built: renders a Coming soon panel. */
  comingSoonDescription?: string;
}

/** Display order: the three real tabs, then the placeholders. */
export const NOTES_TAB_CONFIG: ReadonlyArray<NotesTabConfig> = [
  { id: NOTES_TABS.SUMMARY, label: "Summary" },
  { id: NOTES_TABS.ACTION_ITEMS, label: "Action Items" },
  { id: NOTES_TABS.OUTLINE, label: "Outline" },
  {
    id: NOTES_TABS.AI_SKILLS,
    label: "AI Skills",
    comingSoonDescription:
      "Run AI skills like Key Ideas or Goal Progress to extract specific insights.",
  },
  {
    id: NOTES_TABS.SOUNDBITES,
    label: "Soundbites",
    comingSoonDescription: "Clip out important moments of the recording and share them.",
  },
  {
    id: NOTES_TABS.DISCUSSION,
    label: "Discussion",
    comingSoonDescription: "Bring your teammates in, start threads and comment on this meeting.",
  },
  {
    id: NOTES_TABS.BOOKMARKS,
    label: "Bookmarks",
    comingSoonDescription: "Bookmark moments of the meeting to come back to them later.",
  },
];

const VALID_TABS = new Set<string>(Object.values(NOTES_TABS));

function isNotesTabId(value: string): value is NotesTabId {
  return VALID_TABS.has(value);
}

/** Missing or unknown `?tab=` → the Summary tab, so a hand-edited URL never breaks the page. */
export function parseNotesTab(value: string | null): NotesTabId {
  return value !== null && isNotesTabId(value) ? value : DEFAULT_NOTES_TAB;
}
