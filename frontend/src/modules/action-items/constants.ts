/** Same limit as the backend (`ACTION_TEXT_MAX_LENGTH` in action_items/schemas.py). */
export const ACTION_ITEM_TEXT_MAX_LENGTH = 500;

/** `<select>` value for "nobody"; the schema turns it into `assignee_id: null`. */
export const UNASSIGNED_VALUE = "";

export const ACTION_ITEMS_COPY = {
  ERROR_TITLE: "Couldn't load action items",
  EMPTY_TITLE: "No action items yet",
  EMPTY_BODY: "Add one above, or regenerate the summary to extract them from the transcript.",
  ADD_PLACEHOLDER: "Add an action item and press Enter",
  OPEN_HEADING: "Open",
  COMPLETED_HEADING: "Completed",
  NO_OPEN: "Everything is done.",
  GONE: "This action item no longer exists",
  CREATED: "Action item added",
  UPDATED: "Action item updated",
  DELETED: "Action item deleted",
  OVERDUE: "Overdue",
} as const;
