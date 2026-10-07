// Mirrors backend/app/modules/action_items/schemas.py (snake_case, no mapping layer).

export interface AssigneeBrief {
  id: number;
  name: string;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  assignee: AssigneeBrief | null;
  /** Date only, `YYYY-MM-DD` (no time zone). */
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  source_segment_id: number | null;
  /** Where it was said, resolved from the source segment; null when there is none. */
  source_start_ms: number | null;
  position: number;
}

/** `GET /meetings/{id}/action-items` (not paginated: one meeting has a handful). */
export interface ActionItemList {
  items: ActionItem[];
}

export interface ActionItemCreate {
  text: string;
  assignee_id: number | null;
  due_date: string | null;
}

/** PATCH body: omitted = unchanged; `null` clears `assignee_id` / `due_date`. */
export interface ActionItemUpdate {
  text?: string;
  assignee_id?: number | null;
  due_date?: string | null;
  is_completed?: boolean;
}

export interface GroupedActionItems {
  open: ActionItem[];
  completed: ActionItem[];
}
