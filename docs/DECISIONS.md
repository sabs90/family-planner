# Decision Log

Newest at bottom. Append with today's date when decisions are made or changed.

## 2026-07-07 — Hardware / display stack
- **NAS-hosted web page** displayed in a fullscreen browser (not native device code, not
  Home Assistant dashboards). Reason: maximizes LLM/vibe-code leverage, decouples content
  from hardware, trivial to iterate.
- **Wall-mounted landscape Android tablet + Fully Kiosk Browser** as display+processor
  (tablet is both). Alt kept in reserve: LCD monitor + Raspberry Pi (Chromium kiosk).
- **Rejected:** e-paper (poor for dense, frequently-updating, color content) and ESP32
  (can't run a browser; fights vibe-coding). Home Assistant not used as display layer;
  optional later as data aggregator only.

## 2026-07-07 — Product framing
- This is a **logistics/ops board**, not a calendar. Priority is drop-off/pickup ownership,
  work locations, and kid care locations being glanceable.

## 2026-07-07 — Requirements Q&A
- **"Mascot" = grandparents' place** (childcare at grandparents', suburb of Mascot);
  distinct from daycare, gets its own label/icon.
- **Layout = landscape, days as columns** (Sun→Sat).
- **Content = fully dynamic + checkable chores** → requires a backend on the Synology
  (chose JSON file store to avoid SQLite native builds). Chores persist and reset weekly.
- **Meals = show dinner per day + who cooks** (cook shown in that person's color).

## 2026-07-07 — Architecture
- Node/Express + JSON file store; template static in frontend, dynamic state via API keyed
  by week (Sunday start). Single Docker container on Synology, data bind-mounted.
- Week starts **Sunday** so Sunday prep sets up the coming week.

## 2026-07-07 — Process
- User will build in a **fresh chat** from these docs. "**end session**" is the trigger to
  update docs (see CLAUDE.md). Nothing built yet this session — docs only.

## 2026-07-07 — Build session Q&A
- **Theme: auto** — light 07:00–18:59, dark otherwise; `?theme=light|dark` URL override.
- **Display target:** ~1080p landscape (no specific tablet chosen yet); responsive down to
  phone (days stack vertically, past days hidden on phone).
- **Notes strip: yes** — slim editable strip under the header for one-off reminders.
- **Scope:** built end-to-end (Phases 0–4) in one go per user choice; design review after.

## 2026-07-07 — Build implementation decisions
- ESM (`"type": "module"`), Express is the only dependency, no frontend build step.
- **Port:** container listens on 3000; compose publishes **host 3210**. Local dev also uses
  3210 (`PORT=3210 npm start`) because Finboard occupies 3000 on the dev machine.
- Fixed meals (Wed grandparents dinner) live only in `config.js` (`mealFixed`) — never
  stored server-side, not editable. Server default week is just `{meals:{},tasks:{},notes:''}`.
- Store keeps state in memory, loads file only at boot, atomic tmp+rename writes.
- Task ids `${day}::${slug}`; kid logistics use `dp` (one parent both ways) with `drop`/`pick`
  split supported by the renderer for future use.
- Icons: consistent emoji set (not SVG) — simplest, renders well on tablets.

## 2026-07-07 — Design review round 1 (after seeing it live)
- **Label rail layout**: board restructured from 7 self-contained day cards to one grid
  with a left label column (Sab / Raya / Illy / Ismail / Dinner / Activities / Chores) —
  names no longer repeat in every day column. Phone keeps stacked day cards (names inline).
- **"Grandparents' Mascot" → "Mascot"**; daycare (rose) vs Mascot (green) get distinct
  tinted chip colors so care location reads at a glance.
- **Weather** added per day header: emoji + min–max °C from **Open-Meteo** (free, no key),
  Mascot coords, fetched client-side, cached 1h, silent on failure.
- **Chores expanded**: Sun + groceries; Thu bins, fridge; Fri laundry, tidy, toilets,
  vacuum, meal plan; Sat laundry, study. Sat also gets "Family fun adventure day" 🎉.
- Lane renamed Evening → **Activities** (now holds daytime events too).

## 2026-07-07 — Design review round 2
- **Theme switch button** in header cycling 🌗 Auto → ☀️ Light → 🌙 Dark, saved in
  localStorage; `?theme=` URL param still wins (for pinning the kiosk tablet).
- **Weather extended**: ☔ rain sum (mm) + 💧 mean humidity (%) per day, same Open-Meteo call.
- **Per-day notes row** at the bottom of the grid — tap a day's cell to add one-off info
  ("photo day", etc). Stored per week as `dayNotes.<day>`; server deep-merges and upgrades
  pre-existing week records that lack the field. Weekly notes strip unchanged.

## 2026-07-07 — Schedule editing (round 3)
- **Rejected drag-and-drop**: the data is categorical (which location, which parent), not
  positional — dragging chips maps badly to the real edits and is fiddly on touch.
- **Chosen: inline tap-to-edit + settings page** (user picked "both").
  - Tap any person cell on the board → in-cell editor: location select, D/P select (kids),
    and a **scope toggle: "This week" (default) vs "Every week"**.
  - ⚙️ in the header → `/settings.html`: full routine forms per day — people (incl. custom
    activity + time), fixed dinner, add/remove activities and chores.
- **Template moved server-side** (`template.json`, seeded from `server/default-template.js`;
  `GET/PUT /api/template`). Routine edits no longer require a container rebuild.
  `public/config.js` retains only people/locations.
- **This-week overrides** live in the week record (`overrides.<day>.<group>.<person>`), so
  they expire automatically at week rollover. Sentinel `"__reset__"` clears an override;
  `null` means "nothing scheduled". Overridden cells show a dashed **"this wk"** badge.
- Chore identity: slugs are stable once created (renaming a chore keeps its slug so the
  current week's ticks survive); new chores get slugified-unique slugs on save.
- `docs/SCHEDULE.md` demoted from runtime source of truth to baseline/seed documentation.

## 2026-07-07 — Design review round 4
- **Humidity removed** from the weather line (too busy); kept icon + min–max + rain mm.
- **Chores editable inline**: "+" in each chores cell → in-cell editor (remove ✕ / add with
  label + person). Edits are routine (template) changes; one-offs belong in day Notes.
- **Activities editable inline**: "+" in each activities cell → person dropdown + activity
  dropdown drawn from a **reusable activity catalog** (`template.activities`, seeded with
  Pilates/Futsal/Swimming/etc). "➕ New activity…" appends to the catalog. Also routine-level.
- Server preserves the catalog when a PUT omits `activities` (settings page sends week only).
- Template refetch is skipped while an inline editor is open (open editors hold live
  references into TEMPLATE; replacing it mid-edit would orphan their changes).
- **"+" buttons removed same day** (visual noise on the wall). Replaced with gestures:
  **tap** an Activities cell to open its editor (those cells had no other tap action);
  **press-and-hold ~0.5s** a Chores cell to edit (plain tap still toggles a chore).
  Deleting chores/activities is via ✕ rows inside those editors.
- **✏️ Edit button** added to the header for discoverability (gestures alone too hidden).
  Toggling it on outlines every editable cell (dashed accent) and makes chores cells open
  their editor on plain tap (chore toggling paused in edit mode). "✓ Done" exits. Direct
  interactions (tick chores, tap dinner/notes/people) still work outside edit mode.

## 2026-07-07 — Display hardware changed: tablet → Pi + monitor
- **Superseded:** the "Wall-mounted Android tablet + Fully Kiosk Browser" choice from the
  first hardware decision above. Reason: user wants a bigger monitor than a tablet screen.
- **Chosen:** dedicated **monitor driven by a Raspberry Pi 4B, 4GB RAM**, running Chromium
  in kiosk mode pointed at the NAS URL. NAS still hosts the app via Docker (unchanged).
- **RAM sizing:** 4GB over 2GB — Chromium running 24/7 in kiosk mode creeps in memory over
  days/weeks; 2GB risks OOM kills. 8GB/16GB and Pi 5 are unnecessary for this lightweight,
  low-animation dashboard.
- **Mitigate kiosk memory creep:** nightly cron restart of Chromium (or the Pi), regardless
  of RAM headroom.

## 2026-07-09 — Header rework: prayer widget, weather, calendar row
- **Prayer widget gets two views**, toggled on the settings page and persisted server-side
  in `template.settings.prayerView` (`'countdown'` default, or `'all'`): the existing
  current-prayer + countdown pill, or a row of all 5 prayers with the current one bolded.
  Both views show **Sunrise as its own entry** (not a prayer) so Fajr's window visibly ends
  there instead of silently running into Dhuhr.
- **Prayer widget moved out of the topbar** into its own full-width strip (like the notes
  strip) below the header — the "all 5" view needs more horizontal room than the topbar's
  button row has to spare.
- **Removed the "5 – 11 July" week-range text** from the header (redundant — each day
  column already shows its date) and **swapped clock/date order** so the live clock is the
  rightmost element.
- **Calendar row added**, reading a family Google Calendar via its **secret iCal address**
  (Settings → Integrate calendar) rather than full OAuth — no Google Cloud project, no
  token refresh, fits this app's "keep it simple" ethos. Recurring events are expanded
  server-side with the `node-ical` package (the project's second dependency; still no
  native builds). The URL lives in `server/data/calendar-config.json` (gitignored, created
  manually, never sent to the client — only parsed event titles/times are).
- **Found and fixed a latent robustness bug** while testing this: `fetchWeather`/
  `fetchPrayerTimes` had no request timeout, so a hung external API blocked the entire
  `Promise.all` in `refresh()` — the *whole board*, not just the weather/prayer widgets,
  would fail to render. Added an 8s `AbortController` timeout on all three external-facing
  client fetches (weather, prayer, calendar) and a 10s one on the server's ICS fetch, so a
  slow/dead third-party API degrades gracefully instead of blanking the wall display.

## 2026-07-09 — Header rework, continued (same day)
- **Superseded the full-width prayer strip above**: moved the prayer widget back *into*
  the topbar (centered, between the title and the clock/buttons), because vertical height
  is scarce on a 1080p wall display — a whole extra row for one widget wasn't worth it.
  The topbar is now a 3-part flex row (title / prayer / clock+buttons) so both the
  countdown pill and the all-5 tile row fit on a single line.
- **Emojis dropped from the prayer widget and calendar chips** (🕌/🌅/🗓️) — plain text
  reads cleaner at this density and the labels (Fajr, Sunrise, event titles) are
  self-explanatory without them.
- **Prayer times in 12-hour format**, no leading zero (`7:00am`, not `07:00`) — matches
  how the family actually reads a clock, unlike the 24h wall clock which stays as-is.
- **Individual drop-off/pickup**: the person editor (board + settings page) now has
  separate Drop and Pick selects instead of one combined "drop + pick" select. Same value
  in both collapses to the existing `dp` field (one combined chip); different values use
  the existing `drop`/`pick` fields (two chips) — the data model already supported the
  split, only the editor UI was missing it.
- **Daycare color: red → amber/gold** (softer, less alarming for a location indicator).
  Split a dedicated `--c-danger` variable out for the delete-button hover state, which had
  been incidentally reusing the old red daycare color for an unrelated "danger" affordance.
- **Role subtitles removed** from the label rail (dad/mum/3yo/8mo) — "we know who we are".
- **Google Calendar configured and verified live** against the real family calendar (not
  just a test feed) — the Calendar row now shows real events (e.g. "Finance Night",
  recurring weekly; "Raka's", timed; "Cancel chessable", all-day) correctly placed by date.

## 2026-07-13 — Week-ahead navigation + rotating chores
- **Week navigation** added to the topbar (`‹ ›` arrows next to the title): scroll to
  next/other weeks to plan ahead (Thursday-night ritual) — notes, day notes, chore ticks
  and this-week overrides all already keyed by week-start server-side, so they just work
  on any viewed week. A date-range pill was tried first but cluttered the bar — removed
  in favour of the arrows going accent-colored while off the current week (the day-header
  dates say which week you're on). Kiosk safeguard: auto-returns to the current week
  after 10 min without a nav tap. Range clamped to −1…+3 weeks.
- **Rotating chores**: chores can carry `rotate: [pidOrNull, …]` — index = weeks since
  `ROTATION_EPOCH` (public/rotation.js, `2026-07-13` = week A) mod length; a null slot
  hides the chore that week. Rendered with 🔁 + the on-duty parent; both chore editors
  (board + settings) grew rotation options phrased relative to the week being edited.
- **Routine change**: meal plan moved Friday → Thursday night and now rotates
  (Sab wk A ⇄ Raya wk B); Sunday gained **batch cook** (Sab, wk A) and **lunch cook**
  (Raya, wk B). Applied to the live template via the API and to the seed template.
