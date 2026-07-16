# Family Planner — CLAUDE.md

Entry point for Claude in this repo. Read this first, then the docs it points to.

## What this is
A wall-mounted **family logistics / weekly ops board** for the Hus(?) family. Not a
calendar — the point is to make *"who's got which kid, where is everyone working, and
who's doing drop-off/pickup"* glanceable, plus meals and weekly prep chores. Runs as a
locally-hosted web page on a Synology NAS, displayed fullscreen on a monitor driven by a
Raspberry Pi in kiosk mode, and editable from a phone.

## Status
**v1 feature-complete + post-v1 header/calendar round, verified locally, 2026-07-09** — see
`docs/DECISIONS.md` for the full history. Board + full editing story are done: label-rail
grid, weather, per-day/weekly notes, theme switch, in-app routine editing (inline cell
editors with this-week/every-week scope, ✏️ edit mode, ⚙️ settings page, activity catalog).

Since v1: topbar now carries current weather + a Hanafi-madhab Sydney prayer widget (two
views — countdown or all-5 — toggled on the settings page), kid drop-off/pickup can be set
to two different parents, daycare's chip color moved from red to amber, role subtitles
dropped from the label rail, and a **Calendar row** reads a family Google Calendar (secret
iCal address, configured and confirmed working against the real calendar).

Run locally: `PORT=3210 npm start` → http://localhost:3210 (port 3000 is taken by Finboard
on the dev machine). A dev server may still be running from the last session.

**Remaining (next session):** Docker build test → Synology deploy (README has the steps) →
Pi + monitor kiosk setup → review on real hardware. Optional: settings-page polish, SSE,
multi-calendar support if events live across more than one Google Calendar.

## Doc index
- `docs/PROJECT.md` — goal, why, family context, hardware stack, success criteria.
- `docs/SCHEDULE.md` — **source of truth** for the weekly routine (feeds the app's config).
- `docs/ARCHITECTURE.md` — tech stack, file tree, data model, API, deploy.
- `docs/DESIGN.md` — visual system: layout, colors, components, interaction.
- `docs/BUILD.md` — phased build roadmap with acceptance criteria.
- `docs/DECISIONS.md` — dated decision log (append to this over time).

## Tech stack (decided)
- Frontend: vanilla HTML/CSS/JS single page (no framework). Landscape, 7 day columns.
- Backend: Node/Express + **JSON file store** (not SQLite — avoids native builds on Synology).
  Plus `node-ical` (pure JS) for the family Google Calendar feed.
- Deploy: one Docker container via Synology Container Manager.
- Display: monitor driven by a Raspberry Pi 4B (4GB) running Chromium kiosk mode → NAS URL.

## How to work in this repo
- **Three data tiers — keep the split:**
  1. `public/config.js` — static: people, locations, colors (change = redeploy).
  2. Routine template — server-stored (`server/data/template.json`, seeded from
     `server/default-template.js`), edited in-app via `GET/PUT /api/template`.
     Routine changes need **no container rebuild**. Also carries small display prefs
     (`settings.prayerView`), set from the settings page.
  3. Weekly dynamic state — `server/data/state.json` keyed by week-start (Monday):
     chore ticks, notes, dayNotes, and this-week **overrides** (auto-expire at
     rollover; `"__reset__"` sentinel clears one).
  4. Calendar secret (`server/data/calendar-config.json`, gitignored, created manually —
     see README): `{ icsUrl }` for the family Google Calendar. Never sent to the client;
     only parsed event titles/times are, via `GET /api/calendar/:weekStart`.
- Week starts **Monday**. Column order is Mon→Sun (Sunday prep closes out the week).
- Editors hold live references into the client's TEMPLATE — never refetch the template
  while `editing` is true.
- Keep it vibe-code-friendly and simple: readable vanilla code, minimal deps (Express +
  `node-ical` for the calendar feed).

## ⚑ "end session" trigger
When the user says **"end session"** (or "end the session"), treat it as a signal to
**update the docs before finishing**:
1. Update `docs/BUILD.md` status / checkboxes to reflect what got done.
2. Append any decisions made to `docs/DECISIONS.md` (with today's date).
3. Update the **Status** section above.
4. Reflect any routine changes into `docs/SCHEDULE.md`, design changes into `docs/DESIGN.md`,
   architecture changes into `docs/ARCHITECTURE.md`.
5. Summarize what changed in the reply.
Keep docs the durable memory of this project so any fresh chat can pick up cleanly.
