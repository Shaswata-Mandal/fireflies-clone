/**
 * Mock data for the navbar notification bell.
 *
 * WHAT: Types and a fixed list of fake notifications.
 * LAYER: Shared constants (stand-in for a real API).
 * CALLED BY: `hooks/use-notifications.ts`.
 * CALLS: nothing.
 * MERN EQUIVALENT: a JSON fixture used before the real endpoint exists.
 */

// Mock notifications for the navbar bell. There is no notifications table or endpoint (out of scope),
// so these live client-side only; read state resets on reload.

// A string-literal union: the only four values `kind` may hold (like an enum, but erased at runtime).
export type NotificationKind = "summary" | "action_items" | "transcript" | "upload";

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO 8601, UTC, like every datetime from the API. */
  created_at: string;
  is_read: boolean;
}

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 1,
    kind: "summary",
    title: "Summary ready for Q4 Roadmap Sync",
    body: "Overview, keywords and 4 action items were generated.",
    created_at: "2026-10-07T09:12:00Z",
    is_read: false,
  },
  {
    id: 2,
    kind: "action_items",
    title: "3 action items assigned to you",
    body: "From Sprint 42 Retro: update the release checklist and two more.",
    created_at: "2026-10-07T08:40:00Z",
    is_read: false,
  },
  {
    id: 3,
    kind: "transcript",
    title: "Transcript processed: Acme onboarding call",
    body: "58 minutes, 4 speakers. Open the meeting to search the transcript.",
    created_at: "2026-10-06T16:05:00Z",
    is_read: false,
  },
  {
    id: 4,
    kind: "upload",
    title: "Upload complete: investor-update.vtt",
    body: "Series A Investor Update was added to your meetings.",
    created_at: "2026-10-05T11:30:00Z",
    is_read: true,
  },
  {
    id: 5,
    kind: "summary",
    title: "Summary ready for Senior Engineer Interview",
    body: "Chapters and key takeaways are ready to review.",
    created_at: "2026-10-04T14:20:00Z",
    is_read: true,
  },
];
