# API Contract — `/api/v1`

Base URL: `http://localhost:8000/api/v1`. Interactive docs: `http://localhost:8000/docs`.
All bodies are JSON, snake_case. Datetimes are ISO 8601 UTC. In-meeting times are integer milliseconds.

## Conventions

| Action | Method | Success |
|---|---|---|
| List | GET | 200 `{ items, total, page, limit }` |
| Read | GET | 200 object |
| Create | POST | 201 created object |
| Partial update | PATCH | 200 updated object |
| Delete | DELETE | 204 no body |

**Error shape (every error, including validation):**
```json
{ "error": { "code": "MEETING_NOT_FOUND", "message": "Meeting 12 not found", "details": null } }
```

| Status | code examples |
|---|---|
| 400 | `UNSUPPORTED_FILE`, `EMPTY_TRANSCRIPT`, `TRANSCRIPT_PARSE_ERROR` |
| 404 | `MEETING_NOT_FOUND`, `ACTION_ITEM_NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `VALIDATION_ERROR` (details = list of field errors) |
| 500 | `INTERNAL_ERROR` |

---

## Health

`GET /health` → `{ "status": "ok" }` (not under `/api/v1`; used by the host's health check)

## Current user

`GET /me` → the seeded default user `{ id, name, email, avatar_url }`

---

## Meetings

### `GET /meetings`
Query params (all optional):

| param | type | notes |
|---|---|---|
| q | string | case-insensitive match on title |
| participant_id | int | meetings this participant attended |
| date_from / date_to | date (YYYY-MM-DD) | inclusive range on `meeting_date` |
| tag_id | int | bonus |
| sort | `-meeting_date` (default) \| `meeting_date` \| `title` \| `-duration_ms` | leading `-` = descending |
| page | int ≥ 1 (default 1) | |
| limit | int 1–100 (default 20) | |

Response item (`MeetingListItem`):
```json
{
  "id": 3, "title": "Q4 Roadmap Sync", "meeting_date": "2026-09-30T10:00:00Z",
  "duration_ms": 2712000, "platform": "zoom",
  "participants": [{ "id": 1, "name": "Priya Shah", "avatar_color": "#7c3aed" }],
  "summary_preview": "The team aligned on…", "action_items_open": 3, "tags": []
}
```

### `POST /meetings` — create
Two forms:

1. **JSON** (form or pasted transcript):
```json
{
  "title": "Design review", "meeting_date": "2026-10-01T09:30:00Z",
  "participants": [{ "name": "Priya Shah", "email": "priya@acme.com" }],
  "transcript_text": "[00:00:05] Priya: Let's start…",
  "transcript_format": "txt",
  "generate_summary": true
}
```
`transcript_text` optional (metadata-only meeting allowed). `transcript_format`: `txt` | `vtt` | `json`.

2. **multipart/form-data** at `POST /meetings/upload`: fields `title`, `meeting_date`,
`participants` (JSON string), `generate_summary`, and `file` (`.txt` | `.vtt` | `.json`, ≤ 2 MB).

Speakers found in the transcript that aren't in `participants` are created as participants automatically.
Returns 201 `MeetingDetail`.

### `GET /meetings/{id}` → `MeetingDetail`
```json
{
  "id": 3, "title": "...", "meeting_date": "...", "duration_ms": 2712000, "media_url": null,
  "platform": "zoom", "source": "seed", "created_at": "...", "updated_at": "...",
  "participants": [{ "id": 1, "name": "...", "email": "...", "avatar_color": "...", "role": "host" }],
  "summary": { "overview": "...", "bullet_points": ["..."], "keywords": ["..."], "generated_by": "seed" },
  "chapters": [{ "id": 9, "title": "Budget", "start_ms": 610000, "position": 2 }],
  "tags": []
}
```
Transcript and action items are fetched separately (they can be large / change independently).

### `PATCH /meetings/{id}`
Body (all optional): `{ "title": "...", "meeting_date": "...", "participants": [{ "name": "...", "email": "..." }] }`
`participants`, when present, replaces the full list. → 200 `MeetingDetail`

### `DELETE /meetings/{id}` → 204 (cascades to segments, summary, chapters, action items)

---

## Transcript

### `GET /meetings/{id}/transcript`
```json
{
  "meeting_id": 3,
  "segments": [
    { "id": 101, "position": 0, "speaker_label": "Priya Shah", "participant_id": 1,
      "start_ms": 5000, "end_ms": 11800, "text": "Let's start with the roadmap." }
  ]
}
```
Transcript search/highlighting is done client-side (the whole transcript is already loaded).

### `PATCH /transcript-segments/{segment_id}` (optional)
`{ "text": "...", "speaker_label": "..." }` → 200 segment. Fix transcription errors.

---

## Summary

### `POST /meetings/{id}/summary/generate`
Regenerates summary, chapters, and (if `include_action_items: true`) appends extracted action items.
Uses the LLM generator when `LLM_API_KEY` is configured, otherwise the deterministic mock.
Body: `{ "include_action_items": false }` → 200 `{ summary, chapters }`

### `PATCH /meetings/{id}/summary`
`{ "overview": "...", "bullet_points": [...], "keywords": [...] }` → 200 summary (manual edits)

---

## Action items

### `GET /meetings/{id}/action-items` → `{ "items": [ActionItem] }` ordered by `position`
```json
{ "id": 7, "meeting_id": 3, "text": "Send revised budget", "assignee": { "id": 2, "name": "Rahul" },
  "due_date": "2026-10-10", "is_completed": false, "completed_at": null,
  "source_segment_id": 140, "source_start_ms": 655000, "position": 0 }
```

### `POST /meetings/{id}/action-items`
`{ "text": "...", "assignee_id": 2, "due_date": "2026-10-10" }` → 201

### `PATCH /action-items/{id}`
Any of `text`, `assignee_id`, `due_date`, `is_completed`. Setting `is_completed` sets/clears `completed_at`. → 200

### `DELETE /action-items/{id}` → 204

### `GET /action-items?status=open|completed&page=&limit=` (Home dashboard: "my tasks" across meetings)

---

## Participants

### `GET /participants?q=` → `{ items: [...] }` (filter dropdown, assignee picker)

---

## Search (bonus)

### `GET /search?q=&limit=20`
Full-text search across titles and transcript segments (SQLite FTS5).
```json
{ "items": [
  { "meeting_id": 3, "meeting_title": "Q4 Roadmap Sync", "segment_id": 140, "start_ms": 655000,
    "speaker_label": "Rahul", "snippet": "…send the revised <mark>budget</mark> by Friday…" }
] }
```
Frontend links to `/meetings/3?t=655000` which seeks the player on load.

## Export (bonus)

### `GET /meetings/{id}/export?format=txt|md` → file download (`Content-Disposition: attachment`)

## Ask (bonus, LLM only)

### `POST /meetings/{id}/ask` `{ "question": "..." }` → `{ "answer": "...", "citations": [{ "segment_id": 1, "start_ms": 5000 }] }`
Returns 503 `LLM_NOT_CONFIGURED` when no API key is set.

---

## Transcript upload formats

**.txt** — one utterance per line: `[HH:MM:SS] Speaker Name: text` (also accepts `MM:SS`).
Lines without a timestamp are appended to the previous segment.

**.vtt** — standard WebVTT cues; speaker from `<v Speaker>` tag or `Speaker: text` prefix.

**.json** —
```json
{ "segments": [ { "speaker": "Priya", "start": 5.0, "end": 11.8, "text": "..." } ] }
```
`start`/`end` in seconds (float) → converted to ms. `end_ms` defaults to next segment's start.
