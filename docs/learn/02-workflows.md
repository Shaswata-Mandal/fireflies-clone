# 02 — Workflows (step-by-step traces)

Notation: `file.ext → function` . Paths are relative to `frontend/src/` or `backend/app/`. Every function named here exists; open it while you read.

---

## (a) Opening `/meetings`: list, search, filter, sort, pagination

**Core idea:** the URL is the single source of truth for the view. Nothing is copied into `useState`; the query string is parsed into state, the state is turned into an API query, and TanStack Query fetches it.

### First load

1. Browser requests `/meetings`. Next renders `app/meetings/page.tsx` (server component) → `<Suspense fallback={<MeetingsSkeleton/>}><MeetingsView/></Suspense>`. `Suspense` is required because `MeetingsView` reads `useSearchParams` (otherwise `next build` fails for a static route).
2. `modules/meetings/components/MeetingsView.tsx → MeetingsView`:
   - `useMeetingsUrlState()` (`use-meetings-url-state.ts`) → `parseMeetingsParams(new URLSearchParams(searchParams))` (`url-state.ts`). **Malformed values fall back to defaults** (e.g. `?page=abc` → 1), so a hand-edited URL can never cause a 422.
   - `toMeetingsQuery(state)` → `{ q, participant_id, date_from, date_to, sort, page, limit: 20 }` (`view` is deliberately **not** sent: the "My Meetings / All Meetings" tabs query the same endpoint, decision 67).
   - `useMeetings(query)` (`hooks.ts`) → `useQuery({ queryKey: queryKeys.meetings.list(query), queryFn: listMeetings, placeholderData: keepPreviousData })`.
3. `api.ts → listMeetings` → `apiClient.get("/meetings", { params: query, signal })`. axios drops `undefined` params, so unset filters never reach the URL.
4. Backend: `meetings/router.py → list_meetings`. FastAPI validates query params from the signature: `q` max 200 chars, `page ≥ 1`, `limit` 1..100, `sort: MeetingSort` (enum → anything else is a 422). Builds `MeetingFilters(...)` and calls `service.list_meetings`.
5. `meetings/service.py → list_meetings` → `repository.list_filtered(db, owner.id, filters, sort, page, limit)`:
   - `_conditions()` always starts with `Meeting.owner_id == owner_id`; adds `title ILIKE %q%` (with `escape_like` from `core/sql.py` so `%` and `_` are literal), `EXISTS(participant link)`, `EXISTS(tag link)`, `meeting_date >= day_start(date_from)`, `meeting_date < day_start(date_to) + 1 day`.
   - `total` = `SELECT count(*)` with the same conditions.
   - Page query: correlated scalar subquery `open_items` (count of non-completed action items) computed inside the same statement; `selectinload` for participants, tags, summary → a constant number of queries (no N+1; there is a test asserting it).
   - `ORDER BY` from the whitelist dict `_SORT_ORDER[sort]` (+ `id DESC` tiebreaker so pages are stable); `OFFSET (page-1)*limit LIMIT limit`.
6. Service maps ORM objects to `MeetingListItem` (`_to_list_item`: participants host-first, `summary_preview` ≤ 160 chars) and returns `MeetingList{items,total,page,limit}`.
7. Back in `MeetingsView.renderBody()`: pending → `<MeetingsSkeleton/>`; error → `<MeetingsErrorState onRetry>`; `total === 0` → empty state (two variants: "no meetings" vs "no results + Clear"); otherwise `<MeetingsList>` + `<MeetingsPagination>`. `totalPages = ceil(total/limit)`; `?page=9` beyond the end shows "This page is empty. Go to the first page".
8. `MeetingsList.tsx` groups by day (`group-by-day.ts → groupMeetingsByDay`, local calendar days) only for date sorts (`DATE_SORTS`).

### Search

- `MeetingsToolbar.tsx` renders `MeetingsSearch`, passing `onSearch={(q) => onChange({ q }, { replace: true })}`.
- `MeetingsSearch.tsx`: local `text` state → `useDebounce(text, 300)` (`shared/hooks/use-debounce.ts`) → an effect calls `commit(debouncedText.trim())` → `onSearch(q)`.
- `use-meetings-url-state.ts → update(patch, {replace:true})`: merges the patch into the current state, **resets `page` to 1** (unless the patch itself contains `page`), serialises with `serializeMeetingsParams` (defaults omitted → plain view is just `/meetings`) and calls `router.replace(href, {scroll:false})`.
- `replace` (not `push`) for typing, otherwise Back would step through "r", "ro", "roa"… (decision 63). Filters, sort, tab and page use `router.push` so Back undoes them.
- URL changes → `useSearchParams` changes → `state` recomputes → `query` changes → a **different cache key** → `useMeetings` fetches. While loading, `keepPreviousData` keeps the old list on screen (dimmed to 60 % via `isStale`/`isPlaceholderData`) instead of a skeleton flash (decision 64).

### Filter / sort / pagination

| UI | Component | Calls | API param |
|---|---|---|---|
| Participants (single-select) | `MeetingsFilterPopover` → `FilterParticipantsPane` (uses `useParticipants` → `GET /participants`) | `onChange({ participantId })` | `participant_id` |
| Date range | `FilterDateRangePane` (native `<input type=date>`) | `onChange({ dateFrom, dateTo })` | `date_from`, `date_to` (inclusive whole UTC days) |
| Sort | `MeetingsSortMenu` | `onChange({ sort })` | `sort` = `-meeting_date`, `meeting_date`, `title`, `-duration_ms` |
| Prev / Next | `MeetingsPagination` | `update({ page })` | `page` |
| Clear | `ActiveFilterChips` / empty state | `setState(clearFilters(state))` | |

Pagination is **numbered, not infinite scroll**, so `?page=` means something on reload (decision 65). Total pages come from the server `total`.

---

## (b) Opening a meeting and playing the transcript

### Loading

1. `app/meetings/[id]/page.tsx` (async server component): `parseMeetingIdParam((await params).id)` → a positive integer or `null` (`"abc"`, `"0"`, `"1.5"` → `<MeetingNotFound/>`). Otherwise `<Suspense><MeetingDetailView key={meetingId} meetingId={…}/></Suspense>`.
2. `MeetingDetailView.tsx`: `useMeeting(id)` → `GET /meetings/{id}` (`meetings/router.py → get_meeting` → `service.get_meeting` → `get_owned_or_404` → `repository.get_owned`, with `selectinload` for participant links + participant, tags, summary, chapters). 404 → `<MeetingNotFound/>`; other errors → `<ErrorState/>`; success → `<PlayerProvider durationMs mediaUrl><MeetingDetailLayout/></PlayerProvider>`.
3. `MeetingDetailLayout.tsx`: lays out `[rail | smart-search | notes tabs | TranscriptPanel]` + `<PlayerBar/>`. Calls `useTranscript(id)` and `useDeepLinkSeek(!transcript.isPending)`.
4. `TranscriptPanel.tsx` → `useTranscript` → `GET /meetings/{id}/transcript` (`transcripts/router.py → get_transcript` → `service.get_transcript` → `list_segments` (ownership check via `meetings_service.get_owned_or_404`, then `repository.list_by_meeting` ordered by `position`)). The **whole** transcript is loaded once; search and highlighting then run in the browser.

### Which clock drives playback

`PlayerProvider` always calls **both** `useSimulatedClock` and `useMediaElementClock` (hooks can't be conditional) and picks `engine = mediaUrl ? media : simulated`. Both implement `PlayerEngine { play, pause, seek, setPlaybackRate }` (`player/types.ts`), so nothing above the provider can tell them apart. Seeded meetings have `media_url: null` → **simulated clock**.

### Playing

1. Click play in `PlayerBar` → `usePlayer().toggle()` → `engine.play()`.
2. `use-simulated-clock.ts → play()`: `requestAnimationFrame(tick)`. Each `tick(now)` computes `elapsed = now - lastFrameAt`, `next = min(store.getTimeMs() + elapsed × rate, duration)`, `store.setTimeMs(next)`; stops at the end and calls `onPlayingChange(false)`. Using real elapsed time means 2× speed is exact and a throttled background tab catches up.
3. `time-store.ts → setTimeMs` notifies subscribers **only if the value changed**.

### Two-way sync

| Direction | Mechanism |
|---|---|
| **Clock → transcript highlight** | `transcript/use-active-segment-index.ts` → `useSyncExternalStore(store.subscribe, () => findActiveSegmentIndex(segments, store.getTimeMs()))`. The snapshot is a **number**; React re-renders `TranscriptList` only when the number changes. |
| **Transcript click → clock** | `TranscriptLine` `onClick` → `onSelect(index)` → `TranscriptList.handleSelect` → `seek(segments[index].start_ms); play()`. |
| **Seek bar → clock** | `SeekBar.tsx` → `usePlayer().seek(ms)`; `PlayerProvider.seek` clamps with `clampTime(ms, duration)`. |
| **Deep link → clock** | `use-deep-link-seek.ts`: once data is ready, reads `?t=<ms>` with `parseTimeParam` and seeks (no autoplay). |
| **Chapter / action-item / citation chips → clock** | call `seek(start_ms)` the same way. |

### Binary search for the active segment

`transcript/utils.ts → findActiveSegmentIndex(segments, timeMs)`:

```ts
let low = 0, high = segments.length - 1, found = -1;
while (low <= high) {
  const mid = (low + high) >>> 1;          // integer midpoint
  if (segments[mid].start_ms <= timeMs) { found = mid; low = mid + 1; }  // candidate; look later
  else high = mid - 1;                                                     // too late; look earlier
}
return found;                               // last segment with start_ms <= t, or -1
```

- O(log n) because it runs on every frame; segments are sorted by `start_ms` (the API orders by `position`; the parser sorts by start).
- Before the first segment → `-1` (nothing active). In silences and after the last segment the **previous line stays active**: no flicker (decision 76).
- `summary/use-active-chapter-index.ts` reuses the same function for the Outline tab.

### Click-to-seek and "why doesn't everything re-render?"

`TranscriptList` groups segments into speaker blocks (`groupSegmentsBySpeaker`), renders `SpeakerBlock` → `TranscriptLine`, both `React.memo`. `activeIndex` is passed to a block **only if the block contains it** (`blockContains`), otherwise `-1`, so other blocks keep identical props and skip rendering. `onSelect` is a stable `useCallback`.

### Auto-scroll with manual-override

`transcript/use-auto-scroll.ts`:

- On every `activeIndex` change: if `performance.now() - lastManualScrollAt >= AUTO_SCROLL_PAUSE_MS (3000)` → `scrollLineToCenter(container, activeIndex)` (`dom.ts`: computes the offset and calls `container.scrollTo`, **not** `scrollIntoView`, which would scroll the whole page; respects `prefers-reduced-motion`).
- "Manual" is detected from **intent events** (`wheel`, `touchmove`, scroll keys, pointerdown on the scrollbar), not from `scroll`, because our own smooth scroll fires `scroll` too (decision 77).
- If the active line is off-screen, `isActiveOffscreen` shows `<JumpToCurrentButton>` → `jumpToCurrent()` resets the pause and scrolls.
- Jumping to a search match calls `suspendAutoScroll()` so auto-follow doesn't undo it.

### Transcript search (client-side)

`use-transcript-search.ts`: `query` state → `useDebounce(query, 200)` → `findMatches(segments, q)` (`utils.ts`: `escapeRegExp`, case-insensitive `matchAll`, non-overlapping) → `rangesBySegment` map → `splitHighlight` builds plain/`<mark>` parts (**no `innerHTML`**) → "n of m" and `next/previous` (wrap-around cursor). Clearing is immediate; typing waits 200 ms.

---

## (c) Creating a meeting (upload / paste / form)

### Frontend

1. Navbar "Upload" button → `CreateMeetingContext` opens `CreateMeetingModal` (also rendered at `/uploads`). Both render `CreateMeetingForm.tsx`.
2. One react-hook-form instance holds **all three tabs'** fields (`CREATE_TABS`: upload / paste / manual), validated by the zod schema `meetings/schemas.ts → createMeetingSchema` with `superRefine`: only the active tab's field is required (file → `validateTranscriptFile`: extension, non-empty, ≤ 2 MiB; paste → non-empty text).
3. `onSubmit` → `use-create-meeting-submit.ts → submit(values)`:
   - `localInputToIso(values.meeting_date)` (`datetime.ts`): the `datetime-local` input has no zone; this is the only converter to UTC ISO.
   - upload tab → `useUploadMeeting` → `api.ts → uploadMeeting`: `FormData` (title, meeting_date, `participants` as a JSON **string**, `generate_summary` as text, `file`) → `POST /meetings/upload`. No manual `Content-Type`, the browser adds the multipart boundary.
   - paste/manual → `useCreateMeeting` → `POST /meetings` (JSON; paste adds `transcript_text` + `transcript_format`, the form's format select defaulting to `txt`).
   - Never throws: returns `{ok:true, meeting}` or `{ok:false, error}`; `form-errors.ts → mapCreateError` places backend errors next to the right field (file, pasted text with the line number, title, date, or a banner).
4. On success `refreshAfterCreate` invalidates `meetings.lists()`, `participants.all`, `actionItems.all`; the form shows a "View meeting" toast.

### Backend: validation → parser → summary generator → DB

**Route A: `POST /meetings/upload`** (`meetings/router.py → upload_meeting`)

| Step | Function | What it does |
|---|---|---|
| 1 | Pydantic/FastAPI form parsing | `title`, `meeting_date: AwareDatetime` (naive → 422), `file: UploadFile`; `participants` string; `generate_summary` bool. `python-multipart` makes this possible. |
| 2 | router: `file.file.read(MAX_UPLOAD_BYTES + 1)` | one extra byte proves "too big" without buffering an unbounded body |
| 3 | `service.create_meeting_from_upload` → `_parse_upload_payload` | `TypeAdapter(list[ParticipantInput]).validate_json(participants_json)` + `MeetingCreate(...)`. A `PydanticValidationError` becomes our `ValidationError` (422) with `loc/msg/type` details. |
| 4 | `_decode_upload` | extension in `{.txt,.vtt,.json}` else `UnsupportedFileError` (400); size ≤ 2 MiB else `FileTooLargeError` (413); decode `utf-8-sig` (strips a BOM) else `TranscriptParseError`. |
| 5 | `utils/transcript_parser.py → detect_format(filename, text)` then `parse_transcript(text, fmt)` | normalise newlines/BOM; `_parse_txt` / `_parse_vtt` / `_parse_json`; `_finalize`: sort (stable), drop empty text, fill missing `end_ms` (= next start; last = start + 5 s). Errors carry `details: {line}` or `{segment}`; zero segments → `EmptyTranscriptError`. |
| 6 | `service._create(db, owner, data, parsed, MeetingSource.UPLOAD, MeetingPlatform.UPLOAD)` | **the single create path** shared with route B |

**Route B: `POST /meetings`** → `service.create_meeting`: if `transcript_text` is given → `EmptyTranscriptError` if blank, `fmt = data.transcript_format or detect_format("", text)` (content sniffing when no filename), `parse_transcript`, `source=PASTE`; otherwise `source=FORM` with no transcript. Then `_create(...)`.

**Inside `_create` → `_build_meeting`** (all in memory):

1. `participants_service.find_or_create(db, name, email)` per input person: email-first identity, else case-insensitive name; new people get a deterministic avatar colour (`crc32(name) % palette`). Repository `create` **flushes** so the id exists.
2. `Meeting(...)`; if `parsed`: `_resolve_speakers` maps each speaker label to a participant (case-insensitive; creates missing ones; the label `"Unknown"` → no participant) and appends new speakers to `people` so they become meeting participants; builds `TranscriptSegment`s with `position=i`; `duration_ms = max(end_ms)` if the client gave none.
3. If `data.generate_summary`: `_generate_summary(segments, speakers)` → `summaries/builder.py → build_summary_graph` → `utils/summary_generator.py → get_summary_generator(settings).generate(inputs)` (mock or LLM, see (e)) → unsaved `Summary`, `Chapter`s, `ActionItem`s (assignee resolved from the speaker label, `source_segment` from the index). **Wrapped in try/except: a failure is logged and the meeting is created without a summary** (decision 46).
4. `meeting.participant_links = _build_links(people)`: first person = `host`, others `attendee`.
5. Back in `_create`: `repository.add(db, meeting)` (add + flush) → `db.commit()` **once**. Any exception → `db.rollback()` and re-raise: nothing half-written, no orphan participants.
6. `return get_meeting(db, owner, meeting.id)` re-reads with eager loads → `MeetingDetail`, HTTP **201**.

Edge: `generate_summary` defaults to `False` in the API, but the form's default is `true` (`emptyCreateMeetingValues`). With the manual tab (no transcript) the flag has no effect: there is nothing to summarise.

---

## (d) Edit/delete a meeting; add/complete an action item

### Edit a meeting

1. ⋯ menu (`MeetingActionsMenu` / `MeetingRowActions`) sets state; `EditMeetingModal` → `EditMeetingForm` (zod `editMeetingSchema`: title, date, participants).
2. `onSubmit`: `buildMeetingPatch(original, next)` (`meeting-patch.ts`) returns **only changed fields** (dates compared as instants, participants as a set by name+email). Empty patch → `onDone()` with **no request**.
3. `useUpdateMeeting(id)` → `PATCH /meetings/{id}` → `meetings/service.py → update_meeting`: `get_owned_or_404`; sets only provided fields (`MeetingUpdate` rejects explicit `null`); for participants: `find_or_create` each, `_build_links(people, existing)` **diffs** (keeps existing links and roles; `delete-orphan` removes dropped ones); bumps `updated_at` by hand (link-only edits don't touch the meetings row); commit; return fresh `MeetingDetail`.
4. `onSuccess`: `setQueryData(meetings.detail(id), meeting)` (the PATCH response *is* the full detail, so no refetch), invalidate lists + participants, success toast. On error the dialog stays open, the global handler toasts.

### Delete a meeting (optimistic in the library)

`DeleteMeetingDialog` → `ConfirmDialog` (shared; not dismissable while pending) → `useDeleteMeeting().mutate(id)`:

1. `onMutate`: `cancelQueries(lists)`; snapshot with `getQueriesData`; `setQueriesData` removes the row from **every cached list page** and decrements `total`. Returns `{previous}`.
2. `mutationFn` → `DELETE /meetings/{id}` → `service.delete_meeting` → `repository.delete` → `commit`. The DB's `ON DELETE CASCADE` removes segments, summary, chapters, action items, links (the ORM uses `passive_deletes=True` so it doesn't load them first). 204, no body.
3. `onError`: restore every snapshot (`setQueryData(key, data)`); the global handler toasts.
4. `onSuccess`: `removeQueries` for that meeting's detail + action items (not `invalidate`, which would refetch a 404 and flash "not found").
5. `onSettled`: invalidate lists, participants, action items.

On the detail page `MeetingActionsMenu` passes `onBeforeDelete={pause}` (stop the player) and `onDeleted={() => router.push(ROUTES.MEETINGS)}` (navigate only after the server confirmed: pessimistic there, decision 99).

### Add an action item (pessimistic)

`ActionItemForm` (zod: strings in, API payload out; `""` → `null`) → `useCreateActionItem(meetingId).mutateAsync` → `POST /meetings/{id}/action-items` → `action_items/service.py → create_item`: `get_owned_or_404`; if `assignee_id` → `_ensure_assignee_attends` (must be a participant of this meeting else 422); `position = max_position + 1`; `repository.add` (flush) + `commit` (rollback on error); re-read to populate the assignee; 201. `onSuccess`: `refreshAfterChange` (this meeting's list + library lists) and a toast.

### Complete an action item (optimistic + rollback)

See the full trace in `01-architecture.md` §2. Key code in `action-items/hooks.ts → useToggleActionItem`:

```
onMutate  → patchListOptimistically()   cancel refetches → snapshot → flip is_completed in cache
mutationFn→ PATCH /action-items/{id} { is_completed }
onError   → rollback(snapshot) + toastItemError(error)     (404 → "no longer exists")
onSettled → invalidate byMeeting(id) + meetings.lists()    (server truth wins either way)
```

Why `cancelQueries` first: a refetch already in flight would land after the optimistic write and overwrite it with stale data. Backend rule: `completed_at` is stamped only when the flag actually flips (`_apply_completion`).

Delete follows the same pattern; a **404 on delete keeps the item removed** (already gone elsewhere) instead of rolling back. Edit is pessimistic.

---

## (e) Generate summary and ask-about-meeting: LLM path vs mock fallback

### The switch

`utils/summary_generator.py → get_summary_generator(settings)`: no `GROQ_API_KEY` → `MockSummaryGenerator`; key present → `LLMSummaryGenerator(fallback=mock)`. Both satisfy the `SummaryGenerator` Protocol (`generate(segments) -> GeneratedSummary`): the **Strategy pattern**. `summaries/builder.py → current_generated_by()` labels the saved row `llm` when a key is configured, else `mock`.

### Generate summary

1. `SummaryPanel` button → `useGenerateSummary(id).mutate()` → `POST /meetings/{id}/summary/generate` with `{include_action_items: true}`.
2. `summaries/router.py → generate_summary` → `service.generate_summary`:
   - `transcripts_service.list_segments` (also the ownership check); no segments → `EmptyTranscriptError`.
   - `build_summary_graph(segments, people)` → generator output → unsaved ORM objects.
   - Existing `Summary` → **update in place** (UNIQUE `meeting_id` allows only one row); else add. `repository.delete_chapters` (bulk delete + flush because of `UNIQUE(meeting_id, position)`), add new chapters.
   - `include_action_items` → `action_items_service.append_generated`: dedupe by `text.strip().casefold()` against existing + earlier items; appended after `max(position)`; manual items are never overwritten.
   - One `commit`; any failure → `rollback`, **old summary kept**.
3. Frontend `onSuccess`: `setQueryData` writes `{summary, chapters}` into the meeting detail cache, then invalidates (detail with `exact: true`, action items, library lists).

**Mock path** (`MockSummaryGenerator.generate`): deterministic, no network.
- Keywords: `_ranked_words` (frequency, stopword-filtered, ties alphabetical) → top 8 title-cased.
- Chapters: `_split_into_windows` cuts the meeting into 4-6 equal *time* windows (empty windows skipped); title = top-3 distinctive words; bullet quotes the longest first-sentence in the window.
- Action items: regexes (`I'll`, `we need to`, `can you`, `by Friday`, …) over sentences, assignee = the speaker, up to 10.

**LLM path** (`LLMSummaryGenerator._generate_with_llm`): `build_transcript_prompt` renders `[index] [mm:ss] Speaker: text` (head+tail kept if > 60 000 chars) → `llm_client.generate_text(prompt, system_instruction=_SYSTEM_PROMPT)` → strict JSON → code-fence stripping → validated by Pydantic `_LLMResponse` → `_to_generated` (unknown assignee → `None`, out-of-range segment index → `None`). **Any exception** (no key, 429, timeout, bad JSON) is caught in `LLMSummaryGenerator.generate`, logged as a warning, and the **mock result is returned**. Summaries always exist.

### Ask about a meeting

1. `AskMeetingPanel` → `use-ask-chat.ts → useAskChat(meetingId).send(question)`: appends the user message, sends `{question, history: last ASK_HISTORY_LIMIT}` through `useAskMeeting` (mutation, `suppressErrorToast`, nothing cached).
2. `POST /meetings/{id}/ask` → `ask/router.py → ask_meeting` → `ask/service.py → ask_meeting`:
   - `list_segments` (ownership → 404) / `EmptyTranscriptError`.
   - `prompt.select_segment_indices`: if everything fits in 24 000 chars keep all; else the segments sharing the most words with the question + ±1 neighbours; no keyword hit → alternate from start and end. `build_transcript_text` inserts `[...]` gap markers; lines look like `[s:<segment id>] [mm:ss] Speaker: text`.
   - `generate_text(...)` with the system instruction "use ONLY the transcript; cite `[s:id]`" and the last 6 history messages.
   - `prompt.parse_answer`: strips `[s:N]` tags from the text and returns `citations` **only for ids that exist in this meeting** (a model can invent ids or cite another user's), deduped, first mention first.
3. `AskResponse{answer, citations[{segment_id,start_ms,speaker_label}]}`. The citation chips seek the player to `start_ms`.
4. `POST /ask` (Home AskFred) is the same over the 20 newest meetings (`transcripts.service.list_recent_segments`); citations also carry `meeting_id` + `meeting_title` so the UI links to `/meetings/{id}?t=<ms>`.

**No mock for ask.** In `llm_client.generate_text`:

| Condition | Exception | HTTP |
|---|---|---|
| no `GROQ_API_KEY` | `LLMNotConfiguredError` → `LLM_NOT_CONFIGURED` | 503 |
| provider HTTP 429 | `LLMRateLimitedError` (`details.retry_after = 60`) | 429 |
| any other failure / empty reply | `LLMError` → `LLM_ERROR` | 502 |

Ask lets these propagate so the user sees why (`ask-errors.ts → describeAskError` renders an inline notice with Retry). Summary generation swallows them and falls back to the mock. Only the exception type and status are logged: never the key, prompt or transcript text.

---

## (f) App startup: alembic, seed, health

### Local (what *you* run)

```
cd backend
alembic upgrade head          # 1. create/upgrade tables
python -m app.seed.seed       # 2. optional: seed explicitly (the server also does it on boot)
uvicorn app.main:app --reload # 3. serve
```

### What happens, in order

**1. `alembic upgrade head`** (`alembic/env.py`)
- `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)`: URL comes from your settings, not `alembic.ini`.
- `import app.models` registers all tables on `Base.metadata` (`target_metadata`).
- `run_migrations_online` builds its **own** engine (`NullPool`) that deliberately does **not** enable `PRAGMA foreign_keys`: batch mode rebuilds tables (copy → drop → rename) and dropping a parent with FKs enforced would cascade-delete children.
- Runs `versions/0001_initial_schema.py → upgrade()`; Alembic records the revision in the `alembic_version` table. Already at head → no-op (that's why `start.sh` can run it on every boot).

**2. `uvicorn app.main:app` imports `app.main`** (import-time work):
- `core/config.py` builds `settings = Settings()`: reads env + `.env`; **missing `DATABASE_URL` or `CORS_ORIGINS` crashes here** with a validation error.
- `core/database.py`: `ensure_sqlite_parent_dir` (creates e.g. `/var/data`), `create_engine`, registers the `connect` listener `set_sqlite_pragmas` (`foreign_keys=ON`, `journal_mode=WAL`) for **every** connection, `SessionLocal`.
- `main.py`: `app = create_app()` → `setup_logging`, `FastAPI(lifespan=lifespan)`, `RequestLoggingMiddleware` (innermost), `CORSMiddleware`, `register_exception_handlers`, `/health` router, then 8 module routers under `/api/v1`.

**3. FastAPI `lifespan` startup** (`main.py → lifespan`): if `settings.SEED_ON_STARTUP`: `with SessionLocal() as db: seed_if_empty(db)`.
`seed/seed.py → seed_if_empty`:
1. `_ensure_default_user`: creates user id=1 ("Alex Morgan") if missing: `get_current_user` needs it even if meetings already exist.
2. If any meeting exists → return `False` (a populated DB is never touched).
3. `load_seed_files`: parse **and validate every** `data/*.json` with `seed/schemas.py → SeedMeeting` (cross-references, chronological order, `last end_ms == duration_ms`, exactly one host, shared-email consistency) **before the first insert**; a typo fails fast naming the file.
4. `_insert_meeting` per file in its own transaction (`commit`, `rollback` on error): participants get-or-create by email, tags, segments, chapters, action items (`source_segment` index → real FK via relationships), summary.

If tables don't exist yet (you skipped `alembic upgrade head`), seeding raises and startup fails: migrate first.

**4. Health checks** (`core/health.py`, mounted *outside* `/api/v1`)
- `GET /health` → `{"status":"ok"}`: liveness, touches nothing. Render's `healthCheckPath`.
- `GET /health/db` → runs `SELECT 1`; on `SQLAlchemyError` raises `AppException("DB_UNAVAILABLE", …, 503)` in the standard envelope. Deliberately **not** used as Render's check: a DB hiccup shouldn't restart-loop an otherwise healthy process (decision 103).
- `scripts/smoke.py <base_url>` hits both, then list → create → read → delete → 404.

### Production start (`backend/scripts/start.sh`)

`set -eu` → `cd` to `backend/` → `alembic upgrade head` (failure stops the deploy) → `exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log` (`exec` so SIGTERM reaches uvicorn; `--no-access-log` because our middleware already logs each request with its request id). Seeding then happens in step 3 above.
