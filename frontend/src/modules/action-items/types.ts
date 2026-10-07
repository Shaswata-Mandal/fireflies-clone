/**
 * TypeScript types for the action-items API.
 *
 * WHAT: Interfaces mirroring the backend's Pydantic models, plus a few UI helper shapes.
 * LAYER: Module types (type-only; no runtime code).
 * CALLED BY: api.ts, hooks.ts, utils and components of this module.
 * CALLS: nothing.
 * MERN EQUIVALENT: the TS interfaces for a REST resource.
 */

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
// In a PATCH body, a missing field means "unchanged" and `null` means "clear it" (only for
// assignee_id and due_date). The `?` makes each field optional.
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

/** Item from the cross-meeting list: the usual fields plus the title of the meeting it belongs to. */
export interface OpenActionItem extends ActionItem {
  meeting_title: string;
}

/** `GET /action-items?status=open` (paginated, newest meeting first). */
export interface OpenActionItemList {
  items: OpenActionItem[];
  total: number;
  page: number;
  limit: number;
}
