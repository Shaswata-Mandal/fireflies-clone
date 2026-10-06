# Design tokens — Fireflies UI reference

Derived **only** from the screenshots in `docs/reference/`. Every value is tagged:

- **MEASURED**: read from screenshot pixels with a Pillow script (box mode for fills, farthest-from-background
  median for text and icons, run-length scans for borders).
- **ESTIMATED**: a visual judgement or a value derived from measured ones. Don't treat these as exact.

---

## 0. Read this first: capture conditions

| Fact | Evidence | Status |
|---|---|---|
| **Every screenshot is dark mode.** No light-theme capture exists. | Settings → Appearance (`34-settings-appearance.png.png`) shows *Dark* selected. All 38 images use near-black surfaces. | MEASURED |
| Main screenshots were taken at **device-pixel-ratio 1.25** (Windows 125% scaling). The images are 1917 px wide, so the CSS viewport was **≈ 1534 px**, not 1440. | The Chrome toolbar in `01-…` is 59 px tall and the omnibox 42 px. Chrome draws them at ≈ 47 px and ≈ 34 px at 1×. Text measured at 1.25× gives standard sizes (14 / 18 / 24 px). | ESTIMATED (strong) |
| `31-settings*.png.png`, `32-…`, `33-…` and `34`–`37` were captured at **≈ 0.94 effective scale** (likely 75% browser zoom × 1.25). | The integrations sidebar is 218 px physical vs 290 px elsewhere. Both convert to the same 232 px CSS width. | ESTIMATED |
| All **colors** are unaffected by scale. All **sizes** below are converted to CSS px (physical ÷ 1.25, or ÷ 0.9375 for the settings/integrations shots). | | |

Fixed-width chrome (sidebar, navbar, rails) doesn't change between a 1534 px and a 1440 px viewport. Only the
flexible centre column narrows.

---

## 1. Dark theme (the only theme captured)

### 1.1 Surfaces

The UI uses three neutral surface levels plus two interaction tints.

| Token (CSS var) | Hex | Used for | Source screenshot(s) | Status |
|---|---|---|---|---|
| `--bg-page` | `#131314` | Main content background, meeting list area, detail panels, AskFred panel, player bar, settings main area | `09-meetings-list-meeting-page.png.png`, `17-meeting-detail-full-page.png.png`, `28-upload-page.png`, `31-settings.png.png` | MEASURED |
| `--bg-card` | `#19191A` | Meeting row card, home "Personal Assistant" cards, upload file card, AI-skill rows, inputs (search, AskFred box), outline buttons | `09`, `01-shell-sidebar-expanded.png.png`, `28`, `20-meeting-detail-page-ai-skills.png` | MEASURED |
| `--bg-surface` | `#1E1E1F` | Sidebar, icon rail, top navbar, dropdown menus, popovers, modal body, toast, settings cards | `01`, `09`, `11-meetings-row-option-hover.png.png`, `12-meetings-row-details-popup.png.png`, `29-toast-success.png.png`, `31-settings.png.png` | MEASURED |
| `--bg-hover` | `#232323` | Sidebar nav item hover ("Meetings" in `01`, not highlighted in `05`/`06`) | `01` | MEASURED (assumed hover state) |
| `--bg-active` | `#292929` | Active sidebar item (Home), active settings nav item, active icon-rail item, segmented-control track | `01`, `09`, `31-settings.png.png`, `32-integrations-discover.png.png` | MEASURED |
| `--bg-segment-active` | `#48494C` | Selected segment in segmented controls ("Notes", "Recent", "Personal") | `17`, `01`, `31-settings.png.png` | MEASURED |
| `--bg-avatar-menu-outer` | `#1A1A1A` | Outer container of the avatar mega-menu | `04-shell-avatar-menu.png.png` | MEASURED |
| `--bg-overlay` | ≈ `rgba(0,0,0,0.35)` | Modal backdrop. Measured result: `#131314 → #0E0E0F`, `#1E1E1F → #111112`. The two don't fit one black-alpha value, so the backdrop may also blur. | `12` | ESTIMATED (alpha); results MEASURED |
| Home hero gradient | `#1D2530` (left, cool) → `#282425` (right, warm) over `#131314` | Soft radial glow behind the "Good Night…" header on Home only | `01`, `08-home-dashboard.png.png` | MEASURED samples; gradient shape ESTIMATED |

### 1.2 Borders and dividers

| Token | Hex | Used for | Source | Status |
|---|---|---|---|---|
| `--border-default` | `#292929` | 1 px dividers between sidebar/panels/navbar, card borders, menu borders, toast border, outline-button borders, scrollbar thumb | `09` (x = 69, 382, 1363; y = 63, 153), `17`, `11`, `29`, `20` | MEASURED |
| `--border-strong` | `#323235` | Input borders (global search), idle filter chips | `09` (search), `33-integrations-connected-tab.png.png` | MEASURED |
| `--border-focus` | `#8173F0` | Focused search input, active filter chip, active tab underline | `14-meetings-search.png.png`, `33`, `17` | MEASURED |
| `--border-focus-alt` | `#6E59E2` | Focused AskFred textarea | `17.1-meeting-detail-page.png` | MEASURED |
| `--border-primary` | `#6938EF` | "Filters" button when its popover is open, active icon-rail item (Soundbite) | `10-meetings-filter-open.png.png`, `24-meeting-detail-soundbite-tab.png` | MEASURED |
| `--border-selected` | `#574AAB` | Selected option card (Theme → Dark) | `34` | MEASURED |
| Upload drop-zone (dashed) | `#6E75FF` | Dashed border of the upload area | `28` | MEASURED |

### 1.3 Text

| Token | Hex | Used for | Source | Status |
|---|---|---|---|---|
| `--text-primary` | `#FAFAFB` | Meeting title, list row titles, section headings ("Try More"), empty-state titles, player current time | `17`, `09`, `01` | MEASURED |
| `--text-default` | `#D1D1D6` | Card titles ("Daily Brief"), sidebar labels, settings row titles, active segment label | `01`, `31-settings.png.png`, `17` | MEASURED |
| `--text-body` | `#CBCED6` | Long-form body (AskFred answer). Closest stand-in for transcript text. | `23-meeting-detail-askfred-conversation.png` | MEASURED |
| `--text-greeting` | `#CED0D3` | Home "Good Night, …" greeting, which is dimmer than `--text-primary` | `01` | MEASURED |
| `--text-secondary` | `#AEAEAD` | Meta lines ("Oct 6 · 8:27 PM · 2 min"), breadcrumb, idle segment labels, player icons and speed label (`#AEAEB2`), participant link | `09`, `01`, `17` | MEASURED |
| `--text-tertiary` | `#A3A3A6` | Notification body, idle tab label ("Transcript") | `05-shell-notifications.png.png`, `17` | MEASURED |
| `--text-muted` | `#868686` | Placeholders, "No brief yet", total time "02:06", "Ctrl + K" hint, overline labels ("AI FILTERS"), timestamps | `01`, `09`, `17` | MEASURED |
| `--text-disabled` | `#5D5D62` | Disabled menu item ("Update Language") | `18-meeting-detail-page-options.png` | MEASURED |
| `--text-disabled-strong` | `#434346` | Disabled player icons, "Clear all" | `17.1`, `10` | MEASURED |
| `--text-on-primary` | `#FFFFFF` | Label on primary buttons | `09`, `28`, `24` | MEASURED |
| `--text-link` | `#8173F0` | Inline accent links ("200+ AI Skills"), active tab label, active nav label | `20`, `17`, `09` | MEASURED |
| Neutral underlined link | `--text-secondary` + underline | Participant name, "Share Feedback" | `17`, `34` | MEASURED |

### 1.4 Primary / accent

| Token | Hex | Used for | Source | Status |
|---|---|---|---|---|
| `--primary-600` | `#6938EF` | **All primary buttons** (Capture, Share, Save Your Spot, Browse Files, Discover, Create Soundbite, Create Team, Invite Teammate, Connect) and the player play button | `09`, `17`, `05`, `28`, `33`, `24`, `27-upload-popup.png`, `36-team-or-workspace-teammates.png.png`, `32` | MEASURED (identical in 13 places) |
| `--primary-fg` (accent on dark) | `#8173F0` | Active nav text, toggle-on track, focus ring, tab underline, links | `09`, `31-settings.png.png`, `14`, `17` | MEASURED |
| `--primary-subtle` | `#1F1B3F` | Active channel item bg ("My Meetings"), active filter item, secondary-primary button ("AI Soundbite"), active detail rail item, settings "Upgrade" pill, active filter chip | `09`, `10`, `24`, `17`, `31-settings-profile.png.png`, `33` | MEASURED |
| `--primary-subtle-2` | `#17152E` | "Try Email Assistant" banner, BETA chip, "2/3" badge, AskFred avatar tile | `01`, `04`, `31-settings.png.png`, `23` | MEASURED |
| `--primary-muted` | `#27224B` | "All caught up!" pill, Filters button (open) | `01`, `10` | MEASURED |
| `--primary-selected` | `#29244D` | Selected option card bg (Theme → Dark) | `34` | MEASURED |
| `--primary-send` | `#2C2659` | AskFred send button (idle) | `09`, `01` | MEASURED |
| `--primary-send-alt` | `#412885` | AskFred send button on meeting detail | `17` | MEASURED |
| Accent text on tints | `#7572EA`–`#9590EA` | Text inside the tinted chips above. Antialiasing spreads the values, so use `--primary-fg`. | `01`, `04`, `10` | MEASURED (range) |

**Brand cross-check:** the public brand color `#7A5AF8` does **not** appear as a fill. The sampled button fill
`#6938EF` is noticeably darker. Following the screenshots, **`--primary-600 = #6938EF`** and the brand color
sits at step 500. That pairing (500 = `#7A5AF8`, 600 = `#6938EF`) matches the public *Untitled UI "Purple"*
scale, which the scale below follows. Several status colors also match that palette family (see 1.5).

#### Suggested primary scale

| Step | Hex | Status |
|---|---|---|
| `--primary-50` | `#F4F3FF` | ESTIMATED (derived) |
| `--primary-100` | `#EBE9FE` | ESTIMATED (derived) |
| `--primary-200` | `#D9D6FE` | ESTIMATED (derived) |
| `--primary-300` | `#BDB4FE` | ESTIMATED (derived) |
| `--primary-400` | `#9B8AFB` | ESTIMATED (derived). On-dark accent text actually measures `#8173F0`, so use `--primary-fg` for that. |
| `--primary-500` | `#7A5AF8` | Brand asset (not seen in screenshots) |
| `--primary-600` | `#6938EF` | **MEASURED** |
| `--primary-700` | `#5925DC` | ESTIMATED (derived), suggested hover/pressed for primary buttons (no hover captured) |
| `--primary-800` | `#4A1FB8` | ESTIMATED (derived) |
| `--primary-900` | `#3E1C96` | ESTIMATED (derived) |

### 1.5 Status, chips and badges

| Token | Hex | Used for | Source | Status |
|---|---|---|---|---|
| `--success-bg` | `#10291B` | "40% OFF", "NEW", "New" chips | `01`, `09`, `05`, `18` | MEASURED |
| `--success-fg` | `#72E39C` (range `#6EE39C`–`#75D794`) | Text in those chips | same | MEASURED |
| `--success-solid` | `#2E6746` | "3" free-meetings badge, plan progress bar | `09`, `04` | MEASURED |
| `--success-btn-bg` / `-fg` | `#1C362D` / `#3C8558` | Green "Upgrade" button (navbar, avatar menu) | `09`, `04` | MEASURED |
| `--teal-btn-bg` / `-fg` | `#0C2622` / `#5FE9D0` | "Upgrade" on meeting-detail header | `17` | MEASURED |
| `--info-bg` / `-fg` | `#0D2630` / `#5EE0F3` | "FREE" plan chip | `31-settings-profile.png.png` | MEASURED |
| `--info-fg-alt` | `#33CCF9` | "ADMIN" chip text (same bg) | `36` | MEASURED |
| `--info-icon` | `#4D91E1` | Toast info icon | `29` | MEASURED |
| `--danger` | `#F04438` | Notification dot | `01` | MEASURED |
| `--danger-fg` | `#CC2D3A` (icon `#D12D3A`) | "Delete" item in row options menu | `11` | MEASURED |
| `--warning` | `#F38744` | No warning state is captured. Nearest is the orange sparkle on "Primary Complaint". | `17` | MEASURED color, ESTIMATED role |
| Accent cyan | `#22CCEE` | Sparkle on "Content Calendar" | `17` | MEASURED |
| Amber / green skill tiles | `#84682C` / `#397C59` (gradient bases) | "Key Ideas" / "Time Management" icon tiles | `20` | MEASURED (gradient, approx.) |
| Help FAB | bg `#D5D5FC`, icon `#151618` | Floating "?" button bottom-right | `01` | MEASURED |
| Toggle (on) | track `#8173F0`, thumb `#19191A` | Settings switches | `31-settings.png.png` | MEASURED |

### 1.6 Toast

| Token | Hex | Source | Status |
|---|---|---|---|
| `--toast-bg` | `#1E1E1F` (= `--bg-surface`) | `29-toast-success.png.png` | MEASURED |
| `--toast-border` | `#292929` | `29` | MEASURED |
| `--toast-text` | `#F3FAFB` (≈ `--text-primary`) | `29` | MEASURED |
| `--toast-icon-info` | `#4D91E1` | `29` | MEASURED |

The captured toast is informational ("Removed action-item bookmark"), bottom-centre. Success, error and warning
toast variants are **missing**.

### 1.7 Player bar

| Token | Hex | Used for | Source | Status |
|---|---|---|---|---|
| `--player-bg` | `#131314` | Bar background (same as page) | `17`, `21-meeting-detail-page-video-shown.png` | MEASURED |
| `--seek-track` | `#292929` | Full-width seek track along the bar's top edge | `17` | MEASURED |
| `--seek-fill` | `#6E59E2` | Played portion | `21`, `22-meeting-detail-player-speed-menu.png.png` | MEASURED |
| `--seek-thumb` | `#9E99F7` | Scrubber knob | `17`, `22` | MEASURED |
| `--player-play-bg` | `#6938EF` | Play/pause pill, white icon | `17` | MEASURED |
| `--player-icon` | `#AEAEB2` | Rewind/forward/download/speed | `17` | MEASURED |
| `--player-icon-disabled` | `#434346` | Controls when there's no media | `17.1` | MEASURED |
| Time | current `#FAFAFB`, total `#868686` | "00:08 / 02:06" | `17` | MEASURED |
| Scrub tooltip | bg `#F2F2F7`, text `#1C1618` | Time bubble above the thumb while hovering | `22` | MEASURED |

### 1.8 Avatars and placeholders

| Token | Hex | Used for | Source | Status |
|---|---|---|---|---|
| `--avatar-user` | `#0288D1` + white letter | The only user avatar ("E"), used everywhere | `01`, `09`, `17` | MEASURED |
| File-type tile | `#2194F3` | "MP4" tile on uploads | `28` | MEASURED |
| Skeleton speaker A | `#206156` | Placeholder speaker square in empty transcript | `19-meeting-detail-page-transcript-open.png` | MEASURED |
| Skeleton speaker B | `#87502B` | Second placeholder speaker | `19` | MEASURED |
| Home tile: Daily Brief / Meeting Prep / Tasks | ≈ `#7282B1` / `#BB957D` / `#A3AC41` | Gradient icon tiles | `01` | MEASURED (gradient, approx.) |

**Missing:** a real multi-speaker palette. All screenshots have a single participant, so speaker avatar colors
for transcripts must be designed, not copied.

### 1.9 Skeleton / loading

| Token | Hex | Source | Status |
|---|---|---|---|
| `--skeleton-base` | `#2E3033` (shimmer lighter to ≈ `#36383B`) | `30-loading-skeleton.png.png`, `17.1` | MEASURED |
| Skeleton card | bg `#131314`, border `#292929` | `30` | MEASURED |

### 1.10 Tokens with no source screenshot

| Token | Why missing | Screenshot to add |
|---|---|---|
| **Entire light theme** | All captures are dark | Settings → Appearance → *Light*, then re-capture shell, meetings list, meeting detail, toast, player |
| Transcript active-line highlight | The only meeting has "No spoken words were detected" | Meeting detail with a real transcript while playing |
| Transcript search `<mark>` highlight | Same | Transcript search with matches |
| Speaker avatar colors | Single participant | Meeting with ≥ 3 speakers |
| Table/list row hover bg | `11` row hover keeps `#19191A` and only reveals buttons | Hover over a dropdown item and a list row with the cursor visible |
| Primary button hover/pressed | No hover captured | Hover over "Capture" |
| Success/error toasts | Only an info toast captured | Trigger a delete (error) or save (success) toast |
| Warning state | Not present | Any warning banner |
| Action-items / summary / outline content | Empty meeting | Meeting with a generated summary |

---

## 2. Light theme

**No light-theme screenshots exist, so nothing here is measured.** Leave light-theme values out of this file
until screenshots are added, rather than inventing them. Only `--primary-600 #6938EF` and the primary scale are
safe to reuse in both themes.

---

## 3. Suggested CSS variables (dark)

Names follow CLAUDE.md §5 (`bg-primary-600`, `text-secondary`, `border-default`). Wire these into the
Tailwind v4 `@theme` block in `styles/globals.css` when building the frontend.

```css
.dark {
  /* surfaces */
  --bg-page: #131314;
  --bg-card: #19191a;
  --bg-surface: #1e1e1f;
  --bg-hover: #232323;
  --bg-active: #292929;
  --bg-segment-active: #48494c;
  --bg-overlay: rgb(0 0 0 / 0.35);     /* ESTIMATED */

  /* borders */
  --border-default: #292929;
  --border-strong: #323235;
  --border-focus: #8173f0;

  /* text */
  --text-primary: #fafafb;
  --text-default: #d1d1d6;
  --text-body: #cbced6;
  --text-secondary: #aeaead;
  --text-muted: #868686;
  --text-disabled: #5d5d62;
  --text-on-primary: #ffffff;
  --text-link: #8173f0;

  /* primary */
  --primary-50: #f4f3ff;   /* ESTIMATED */
  --primary-100: #ebe9fe;  /* ESTIMATED */
  --primary-200: #d9d6fe;  /* ESTIMATED */
  --primary-300: #bdb4fe;  /* ESTIMATED */
  --primary-400: #9b8afb;  /* ESTIMATED */
  --primary-500: #7a5af8;  /* brand asset */
  --primary-600: #6938ef;  /* MEASURED */
  --primary-700: #5925dc;  /* ESTIMATED */
  --primary-800: #4a1fb8;  /* ESTIMATED */
  --primary-900: #3e1c96;  /* ESTIMATED */
  --primary-fg: #8173f0;
  --primary-subtle: #1f1b3f;
  --primary-subtle-2: #17152e;
  --primary-muted: #27224b;

  /* status */
  --success-bg: #10291b;
  --success-fg: #72e39c;
  --success-solid: #2e6746;
  --info-bg: #0d2630;
  --info-fg: #5ee0f3;
  --info-icon: #4d91e1;
  --danger: #f04438;
  --danger-fg: #cc2d3a;
  --warning: #f38744;      /* role ESTIMATED */

  /* player */
  --seek-track: #292929;
  --seek-fill: #6e59e2;
  --seek-thumb: #9e99f7;

  /* misc */
  --avatar-user: #0288d1;
  --skeleton-base: #2e3033;
}
```

---

## 4. Typography

**Family (ESTIMATED, visual match):** **Inter** for the whole app UI (two-storey `a`, flat-topped `t`, `1`
with a flag, `G` with a spur). The upload heading "Upload a file to generate a transcript" (`28`) uses a
different geometric face with a single-storey `a`, which looks like **Poppins**. These are guesses from glyph
shapes, not from CSS.

**Base size (ESTIMATED):** UI body text is **14 px**. Sidebar labels, card body, meta lines, menus and
AskFred answers all measure ≈ 10.2 px CSS cap height, which is Inter 14 px. The root is probably the browser
default 16 px, with body copy set at 14 px.

Sizes come from cap height: physical ink rows ÷ scale ÷ 0.727 (Inter cap ratio), rounded to the nearest
standard size. Ink rows are measured, but the resulting px sizes and all weights are **ESTIMATED**.

| Role | Example (screenshot) | Size | Weight | Color |
|---|---|---|---|---|
| Page title / greeting | "Good Night, Experimentation2025" (`01`) | 24 px | 500 | `#CED0D3` |
| Meeting title | "Video Project 1.mp4" (`17`) | 24 px | 400–500 | `--text-primary` |
| Section heading | "Try More" (`01`), AskFred "Hi Experimentation2025!" (`06`) | 18 px | 600 | `--text-primary` |
| Empty-state title | "No meeting summary available" (`17`) | 16 px | 500 | `--text-primary` |
| Large empty-state title | "No spoken words were detected" (`19`) | 20 px | 400–500 | `--text-primary` |
| List row title | "Video Project 1.mp4" in list (`09`) | 15 px (maybe 16) | 600 | `--text-primary` |
| Card title | "Daily Brief" (`01`) | 14 px | 500 | `--text-default` |
| Body | "No brief yet", AskFred answer (`01`, `23`) | 14 px, line-height ≈ 24 px | 400 | `--text-body` / `--text-muted` |
| Nav label | Sidebar items (`01`) | 14 px | 400 (active 500) | `--text-default` |
| Button | "Capture", "Browse Files" | 14 px | 500–600 | white |
| Meta / caption | "Oct 6 · 8:27 PM · 2 min" (`09`) | 14 px | 400 | `--text-secondary` |
| Small caption | "You've reached the end of your meetings." (`09`) | 12 px | 400 | `#AAABB2` |
| Overline | "AI FILTERS", "SENTIMENTS" (`17`) | 12 px, uppercase | 400–500 | `--text-muted` |
| Chip | "NEW", "40% OFF", "BETA" | 12 px | 500 | per chip |
| Player time | "00:08 / 02:06" (`17`) | 14 px, tabular | 500 / 400 | primary / muted |
| Transcript text | *No transcript captured.* Use body (14 / 24) until a reference exists. | 14 px | 400 | `--text-body` |
| Settings row title / description | `31-settings.png.png` | 14 px / 13–14 px | 500 / 400 | `--text-default` / `--text-muted` |
| Upload heading (Poppins?) | `28` | 20 px | 600 | `--text-primary` |

---

## 5. Layout measurements (all ESTIMATED, CSS px)

Measured in physical pixels by scanning for `#292929` border lines, then divided by 1.25 (or 0.9375 for
integrations/settings). The pixel scans are exact, but the CSS conversion depends on the DPR inference in §0.

| Element | Physical px | ≈ CSS px | Source |
|---|---|---|---|
| Sidebar, expanded (incl. 1 px border) | 290 | **232** | `01`, `32` (218 px @ 0.94) |
| Icon rail (collapsed sidebar / meetings view) | 70 | **56** | `09`, `02-shell-sidebar-collapsed.png.png` |
| Icon rail on meeting detail | 61 | **48** | `17` |
| Top navbar height (incl. bottom border) | 64 | **52** | `01` (y 59→123), `09`, `32` (49 px @ 0.94) |
| Meeting-detail header height | ≈ 72 | **56** | `17` |
| Meetings sub-toolbar (Hosted by me / Filters row) | 65 | **52** | `09` |
| Meetings channel panel width | 313 | **250** | `09` |
| AskFred side panel width | 553 | **≈ 440** | `09` |
| Meeting detail: left panel / right panel | 427 / 535 | **≈ 340 / ≈ 430** | `17` |
| Page padding (list inset from panel edge) | 30 | **24** | `09` |
| Home content column max-width | 1025 | **≈ 820** | `01` |
| Settings content column width | 655 @ 0.94 | **≈ 700** | `31-settings.png.png` |
| Card radius (list cards, settings cards) | ≈ 12 | **≈ 10** (`rounded-lg`/`rounded-xl`) | `09`, `28`, `31` |
| Small card / input / toast radius | ≈ 7–8 | **≈ 6** (`rounded-md`) | `20`, `09`, `29` |
| Modal radius | ≈ 20 | **≈ 16** (`rounded-2xl`) | `12` |
| Primary button radius | ≈ 5 | **≈ 4–6** | `09` |
| Primary button height (navbar / page) | 39 / 50 | **≈ 32 / 40** | `09`, `28` |
| Sidebar nav item height | ≈ 40 | **≈ 32** | `01` |
| **Player bar height** | ≈ 88 | **≈ 70–72** | `17`, `22` |
| Seek track thickness (top edge of bar) | 3 | **≈ 2** | `17` |
| Seek thumb diameter | ≈ 20 | **≈ 16** | `17`, `22` |
| Play/pause pill | ≈ 61 × 39 | **≈ 48 × 32** | `17` |

At a 1440 px viewport, sidebar, rails, navbar, panel widths and player height stay the same. Only the centre
column shrinks (about 94 px narrower than in the screenshots).

---

## 6. Screenshot inventory

All 38 files are dark mode. Most filenames end in a doubled `.png.png`.

| # | File | Screen |
|---|---|---|
| 01 | `01-shell-sidebar-expanded.png.png` | Home with expanded sidebar (includes the browser toolbar) |
| 02 | `02-shell-sidebar-collapsed.png.png` | Home with collapsed icon rail |
| 03 | `03-shell-navbar.png.png` | Navbar strip only |
| 04 | `04-shell-avatar-menu.png.png` | Workspace/avatar mega-menu |
| 05 | `05-shell-notifications.png.png` | Notifications panel |
| 06 | `06-askfred-sidebar-opened.png` | Home with AskFred side panel |
| 07 | `07-askfred-sidebar-closed.png` | Home, AskFred bottom bar with quick chips |
| 08 | `08-home-dashboard.png.png` | Home dashboard |
| 09 | `09-meetings-list-meeting-page.png.png` | Meetings list (My Meetings) |
| 10 | `10-meetings-filter-open.png.png` | Filters popover |
| 11 | `11-meetings-row-option-hover.png.png` | Row hover with ⋯ options menu |
| 12 | `12-meetings-row-details-popup.png.png` | Meeting details modal |
| 13 | `13-all-meetings-tab.png.png` | All Meetings channel |
| 14 | `14-meetings-search.png.png` | List search, no results empty state |
| 15 | `15-askfred-chat-history.png.png` | AskFred history popover (cropped) |
| 17 | `17-meeting-detail-full-page.png.png` | Meeting detail (Notes, AskFred tab, player) |
| 17.1 | `17.1-meeting-detail-page.png` | Meeting detail loading skeleton, AI filters expanded |
| 18 | `18-meeting-detail-page-options.png` | Meeting ⋯ options menu |
| 19 | `19-meeting-detail-page-transcript-open.png` | Transcript tab (empty) |
| 20 | `20-meeting-detail-page-ai-skills.png` | AI Skills tab |
| 21 | `21-meeting-detail-page-video-shown.png` | Video player shown |
| 22 | `22-meeting-detail-player-speed-menu.png.png` | Player scrub tooltip (strip) |
| 23 | `23-meeting-detail-askfred-conversation.png` | AskFred conversation |
| 24 | `24-meeting-detail-soundbite-tab.png` | Soundbite panel |
| 25 | `25-meeting-detail-discussion-tab.png` | Discussion panel |
| 26 | `26-meeting-detail-bookmark-tab.png` | Bookmarks panel |
| 27 | `27-upload-popup.png` | Capture dropdown (upload option) |
| 28 | `28-upload-page.png` | Uploads page |
| 29 | `29-toast-success.png.png` | Toast (info style) |
| 30 | `30-loading-skeleton.png.png` | Meetings list skeleton |
| 31 | `31-settings.png.png` | Settings → Recording & Privacy (≈ 0.94 scale) |
| 31b | `31-settings-profile.png.png` | Settings → Account (≈ 0.94 scale) |
| 32 | `32-integrations-discover.png.png` | Integrations → Discover (≈ 0.94 scale) |
| 33 | `33-integrations-connected-tab.png.png` | Integrations → Connected, empty (≈ 0.94 scale) |
| 34 | `34-settings-appearance.png.png` | Settings → Language & Appearance |
| 35 | `35-team-or-workspace.png.png` | Settings → Account (duplicate view) |
| 36 | `36-team-or-workspace-teammates.png.png` | Team → Teammates |
| 37 | `37-settings-account-tab.png.png` | Team → Account |
